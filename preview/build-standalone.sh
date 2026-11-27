#!/bin/sh
# Wraps the artifact source (index.html, no skeleton) into a locally runnable page.
cd "$(dirname "$0")"
{ printf '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'; cat index.html; printf '\n</html>\n'; } > standalone.html
