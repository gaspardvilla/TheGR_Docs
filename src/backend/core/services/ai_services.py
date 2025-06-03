"""AI services."""

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import connection

from openai import OpenAI

from core import enums
from core.models import *

AI_ACTIONS = {# {{{
    "prompt": (
        "Answer the prompt in markdown format. "
        "Preserve the language and markdown formatting. "
        "Do not provide any other information. "
        "Preserve the language."
    ),
    "correct": (
        "Correct grammar and spelling of the markdown text, "
        "preserving language and markdown formatting. "
        "Do not provide any other information. "
        "Preserve the language."
    ),
    "rephrase": (
        "Rephrase the given markdown text, "
        "preserving language and markdown formatting. "
        "Do not provide any other information. "
        "Preserve the language."
    ),
    "summarize": (
        "Summarize the markdown text, preserving language and markdown formatting. "
        "Do not provide any other information. "
        "Preserve the language."
    ),
    "beautify": (
        "Add formatting to the text to make it more readable. "
        "Do not provide any other information. "
        "Preserve the language."
    ),
    "emojify": (
        "Add emojis to the important parts of the text. "
        "Do not provide any other information. "
        "Preserve the language."
    ),
}

AI_TRANSLATE = (
    "Keep the same html structure and formatting. "
    "Translate the content in the html to the specified language {language:s}. "
    "Check the translation for accuracy and make any necessary corrections. "
    "Do not provide any other information."
)# }}}

class AIAgent:
    "AI Agent class"

    def process_input(self, prompt, db_context):
        messages = []

        for context in db_context:
            messages.append({"role": "system", "content": context})

        messages.append({"role": "user", "content": f"Give me the SQL query to answer this question: {prompt}"})
        return messages


    def extract_sql(self, output):
        no_newline = ' '.join(output.split('\n'))
        sql = no_newline.split('```sql')[1].split('```')[0]
        return sql


    def give_final_context(self, results, prompt):
        messages = [
            {
                "role": "system",
                "content": f"Given the SQL query results below, generate a response matching the user's original request, using their language and context: {prompt}, {results}",
            },
            {
                "role": "system",
                # "content": "If no results are found, answer with 'No results found.'",
                "content": "If no results are found, answer with a joke",
            },
            {
                "role": "user",
                "content": f"Give a short summary of these SQL query results: {results}",
            },
        ]
        return messages


    def pipeline(self, data):
        url = "https://albert.api.etalab.gouv.fr/v1"
        key = "sk-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo4NDE2LCJ0b2tlbl9pZCI6MTQ4NSwiZXhwaXJlc19hdCI6MTc4MDM1MTIwMH0.7VHhWl1KUfMCfxwZ_bTVS2McIsY3qsP5Gcc6dQqb6Wg"
        client = OpenAI(base_url = url, api_key = key)
        response = client.chat.completions.create(model="albert-small", messages=data)
        # TODO use this to run query
        query = self.extract_sql(response.choices[0].message.content)
        results = []

        with connection.cursor() as cursor:
            cursor.execute(query);
            results = cursor.fetchall();

        final_context = self.give_final_context(results, self.prompt)

        final_response = client.chat.completions.create(
                model = "albert-small",
                messages = final_context
                )
        return {"prompt": query, "answer": final_response.choices[0].message.content}


    def make_context(self, model):
        meta = model._meta
        fields = meta.fields
        context = {}
        space = " "

        context["role"] = "system"
        context["content"] = ""

        content = ""
        content += "Table name is " + meta.db_table + space
        content += "and has the following columns," + space

        for field in fields:
            content += space + field.name + " is of type " + field.get_internal_type()

        content += "."
        res = { }
        res["role"] = "system"
        res["content"] = content

        return res

    def get_prompt_context(self):
        messages = []
        model = "model"
        models = [
            Document,
            DocumentAccess,
            DocumentFavorite,
            Invitation,
            LinkTrace,
            User,
        ]

        for model in models:
            context = self.make_context(model)
            messages.append(context)

        return messages


    def perform(self, text):
        data = self.get_prompt_context()
        self.prompt = text

        prompt = {}
        prompt["role"] = "user"
        prompt["content"] = text

        data.append(prompt)

        result = self.pipeline(data)
        return result
        # return {"answer" : result }

class AIService:
    """Service class for AI-related operations."""

    def __init__(self):
        """Ensure that the AI configuration is set properly."""
        if (
            settings.AI_BASE_URL is None
            or settings.AI_API_KEY is None
            or settings.AI_MODEL is None
        ):
            raise ImproperlyConfigured("AI configuration not set")
        self.client = OpenAI(base_url=settings.AI_BASE_URL, api_key=settings.AI_API_KEY)

    def call_ai_api(self, system_content, text):
        """Helper method to call the OpenAI API and process the response."""
        response = self.client.chat.completions.create(
            model=settings.AI_MODEL,
            messages=[
                {"role": "system", "content": system_content},
                {"role": "user", "content": text},
            ],
        )

        content = response.choices[0].message.content

        if not content:
            raise RuntimeError("AI response does not contain an answer")

        return {"answer": content}

    def transform(self, text, action):
        """Transform text based on specified action."""
        system_content = AI_ACTIONS[action]
        return self.call_ai_api(system_content, text)

    def translate(self, text, language):
        """Translate text to a specified language."""
        language_display = enums.ALL_LANGUAGES.get(language, language)
        system_content = AI_TRANSLATE.format(language=language_display)
        return self.call_ai_api(system_content, text)

