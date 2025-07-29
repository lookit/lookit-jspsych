serve: uv
	uv run mkdocs serve --strict -a localhost:8888

build: uv
	uv run mkdocs build --strict

uv:
	uv self update
	uv sync

clean:
	rm -rf ./site ./.venv

