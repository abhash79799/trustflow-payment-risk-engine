import json
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler

from lib.engine import InputError, evaluate


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))

            if not 0 < length <= 20_000:
                raise InputError(
                    "Request body must be between 1 and 20,000 bytes."
                )

            payload = json.loads(self.rfile.read(length).decode("utf-8"))

            self.send_json(
                HTTPStatus.OK,
                evaluate(payload)
            )

        except (ValueError, TypeError, InputError) as error:
            self.send_json(
                HTTPStatus.BAD_REQUEST,
                {"error": str(error)}
            )

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")

        self.send_response(status)
        self.send_header(
            "Content-Type",
            "application/json; charset=utf-8"
        )
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
