SHELL := /bin/bash

.PHONY: install \
        dev-local-ai-assistent \
        dev-next-lift-prediction \
        dev-spam-classifier \
        dev-supplier-recommendation

install:
	@(. ~/.nvm/nvm.sh && cd local_ai_assistent && nvm use && npm install) & \
	(. ~/.nvm/nvm.sh && cd next_lift_prediction && nvm use && npm install) & \
	(. ~/.nvm/nvm.sh && cd spam_email_classifier && nvm use && npm install) & \
	(. ~/.nvm/nvm.sh && cd supplier_recommendation_system && nvm use && npm install) & \
	wait

dev-local-ai-assistent:
	cd local_ai_assistent && npm start

dev-next-lift-prediction:
	cd next_lift_prediction && npm start

dev-spam-classifier:
	cd spam_email_classifier && npm start

dev-supplier-recommendation:
	cd supplier_recommendation_system && docker compose up -d && npm run dev
