#!/usr/bin/env python3
"""Send a newly deployed Tiraspol newspaper issue to Telegram."""

from __future__ import annotations

import html
import os
import re
import sys
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


class LeadParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_lead = False
        self.capture: str | None = None
        self.parts: dict[str, list[str]] = {"h2": [], "p": []}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        classes = dict(attrs).get("class", "") or ""
        if tag == "section" and "lead" in classes.split():
            self.in_lead = True
        if self.in_lead and tag in self.parts and self.capture is None:
            if tag == "h2" or (tag == "p" and self.parts["h2"]):
                self.capture = tag

    def handle_endtag(self, tag: str) -> None:
        if self.capture == tag:
            self.capture = None
        if tag == "section" and self.in_lead:
            self.in_lead = False

    def handle_data(self, data: str) -> None:
        if self.capture:
            self.parts[self.capture].append(data.strip())


def main() -> int:
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = os.getenv("TELEGRAM_CHAT_ID", "").strip()
    if not token or not chat_id:
        print("::notice::Добавьте секреты TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID, чтобы включить доставку.")
        return 0

    if len(sys.argv) != 2:
        print("Нужно передать путь к HTML-выпуску.")
        return 2

    relpath = sys.argv[1].replace("\\", "/")
    if not re.fullmatch(r"artifacts/utrenniy-list-\d{4}-\d{2}-\d{2}\.html", relpath):
        print("Передан файл не из серии утренних выпусков.")
        return 2

    issue_path = Path(relpath)
    if not issue_path.is_file():
        print("HTML-выпуск не найден в checkout.")
        return 2

    match = re.search(r"(\d{4}-\d{2}-\d{2})", issue_path.name)
    issue_date = datetime.strptime(match.group(1), "%Y-%m-%d").strftime("%d.%m.%Y") if match else ""
    parser = LeadParser()
    parser.feed(issue_path.read_text(encoding="utf-8"))
    headline = " ".join(" ".join(parser.parts["h2"]).split()) or "Новый выпуск"
    summary = " ".join(" ".join(parser.parts["p"]).split())
    if len(summary) > 360:
        summary = summary[:357].rsplit(" ", 1)[0] + "…"

    link = "https://asm-o-dan.github.io/eli5-visual-hub/" + relpath
    message = f"🗞 Утренний лист · {issue_date}\n\n{headline}"
    if summary:
        message += f"\n{summary}"
    message += f"\n\nЧитать выпуск: {link}"

    request = Request(
        f"https://api.telegram.org/bot{token}/sendMessage",
        data=urlencode({"chat_id": chat_id, "text": message, "disable_web_page_preview": "false"}).encode(),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=20) as response:
            result = response.read().decode("utf-8")
        if '"ok":true' not in result.replace(" ", "").lower():
            print("Telegram API не подтвердил отправку сообщения.")
            return 1
    except HTTPError as error:
        print(f"Telegram API вернул HTTP {error.code}; проверьте настройки бота и chat ID.")
        return 1
    except (URLError, TimeoutError):
        print("Не удалось связаться с Telegram API.")
        return 1

    print(f"Ссылка на выпуск отправлена в Telegram: {link}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
