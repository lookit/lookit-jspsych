serve: poetry
	poetry run mkdocs serve --strict -a localhost:8888

build: poetry
	poetry run mkdocs build --strict

poetry:
	poetry check
	poetry self update
	poetry update --sync

clean:
	rm -rf ./site $(shell poetry env info -p)

