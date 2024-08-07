serve: poetry
	poetry run mkdocs serve

build: poetry
	poetry run mkdocs build --strict

poetry:
	poetry install --no-root --sync

clean:
	rm -rf ./site $(shell poetry env info -p)

