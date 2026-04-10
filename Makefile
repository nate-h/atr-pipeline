COMPOSE = docker compose

.PHONY: up down logs backend-lint backend-typecheck frontend-lint frontend-typecheck

up:
	$(COMPOSE) up --build

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

backend-lint:
	$(COMPOSE) run --rm backend ruff check app

backend-typecheck:
	$(COMPOSE) run --rm backend mypy app

frontend-lint:
	$(COMPOSE) run --rm frontend npm run lint

frontend-typecheck:
	$(COMPOSE) run --rm frontend npm run typecheck

