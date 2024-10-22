serve: poetry
	poetry run mkdocs serve --strict -a localhost:8888

build: poetry
	poetry run mkdocs build --strict

poetry:
	poetry check
	poetry self update
	poetry env use 3.13
	poetry update --sync

clean:
	rm -rf ./site $(shell poetry env info -p)

