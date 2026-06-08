# app_tfe — Application de gestion d'audits & de requêtes (TFE)

Application web composée de deux parties :

- **Backend** : API REST en **FastAPI** (Python) avec une base de données **MongoDB**, authentification **JWT**, génération de **PDF** (reportlab) et **planificateur** d'envoi mensuel des journaux d'audit par e-mail (APScheduler).
- **Frontend** : application **Angular 17** (SPA) qui consomme l'API via un proxy.

Fonctionnalités principales : gestion des **utilisateurs**, **groupes** et **adhésions** (memberships), **rôles**, **deals**, **requêtes** (queries) et **audits** avec export PDF.

---

## 1. Prérequis

| Outil              | Version recommandée | Vérifier avec      |
| ------------------ | ------------------- | ------------------ |
| **Python**         | 3.11 ou 3.12        | `python --version` |
| **Node.js**        | 18 LTS ou +         | `node --version`   |
| **npm**            | 9 ou +              | `npm --version`    |
| **MongoDB Server** | 6.x / 7.x / 8.x     | `mongod --version` |
| **Git**            | —                   | `git --version`    |

---

## 2. Cloner le projet

```bash
git clone https://github.com/Ters94/app_tfe.git
cd app_tfe
```

---

## 3. Configuration des variables d'environnement

Le backend lit sa configuration depuis un fichier `.env` (ignoré par git, il faut donc le créer).
Créez un fichier **`.env` à la racine du projet** (`app_tfe/.env`) avec le contenu suivant :

```env
# Base de données MongoDB
MONGO_URI=mongodb://localhost:27017
DATABASE_NAME=app_tfe

# Authentification JWT
JWT_SECRET=changez-moi-par-une-chaine-aleatoire-longue
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60

# Envoi d'e-mails (optionnel — laisser vide pour désactiver l'envoi des audits)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
APP_NAME=ENGIE Queries
```

| Variable | Rôle | Obligatoire |
| --- | --- | --- |
| `MONGO_URI` | URL de connexion MongoDB | Oui |
| `DATABASE_NAME` | Nom de la base utilisée | Oui |
| `JWT_SECRET` | Clé secrète de signature des tokens (mettre une valeur forte) | Oui |
| `JWT_ALGORITHM` | Algorithme JWT (défaut `HS256`) | — |
| `JWT_EXPIRE_MINUTES` | Durée de validité d'un token (minutes) | — |
| `SMTP_*` | Serveur d'e-mail pour l'envoi automatique des journaux d'audit | Non |

> Sans `SMTP_USER` / `SMTP_PASSWORD`, l'application démarre normalement, mais l'**envoi mensuel des audits par e-mail** ne fonctionnera pas.
> Pour Gmail, utilisez un **mot de passe d'application** (pas votre mot de passe habituel).

---

## 4. Installation & lancement du backend (FastAPI)

Depuis la racine `app_tfe/` :

### 4.1 Créer et activer un environnement virtuel

#### Windows (PowerShell)

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

#### Linux / macOS

```bash
python -m venv venv
source venv/bin/activate
```

### 4.2 Installer les dépendances Python

Le fichier `requirements.txt` ne contient pas toutes les dépendances réellement utilisées. Installez l'ensemble complet :

```bash
pip install --upgrade pip
pip install fastapi uvicorn pydantic pymongo python-jose passlib "bcrypt==4.0.1" \
            python-dotenv email-validator apscheduler reportlab python-multipart
```

> Dépendances **en plus** de `requirements.txt` : `apscheduler`, `reportlab`, `python-multipart`.
>
> **Important : figez `bcrypt==4.0.1`.** `passlib 1.7.4` (utilisé par le projet) est incompatible
> avec `bcrypt >= 4.1`. Avec une version trop récente de `bcrypt`, la vérification des mots de passe
> échoue et **toutes les connexions renvoient une erreur 500** (voir §8 Dépannage).

### 4.3 Lancer le serveur

**À lancer depuis la racine `app_tfe/`** (le code importe le package `backend`) :

```bash
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Le backend est alors disponible sur :

- API : <http://127.0.0.1:8000>
- Documentation interactive (Swagger UI) : <http://127.0.0.1:8000/docs>
- Documentation ReDoc : <http://127.0.0.1:8000/redoc>

Au démarrage, vous devez voir dans la console :

```text
Connected to MongoDB
Application startup complete.
```

---

## 5. Installation & lancement du frontend (Angular)

Dans un **second terminal**, depuis le dossier `frontend/` :

```bash
cd frontend
npm install
npm start
```

`npm start` lance `ng serve` qui utilise automatiquement le proxy (`proxy.conf.json`) :
toutes les requêtes vers `/api` sont redirigées vers le backend `http://127.0.0.1:8000`.

Le frontend est disponible sur : <http://127.0.0.1:4200>

> Les paquets `jspdf` et `jspdf-autotable` (utilisés pour l'export PDF côté client) sont
> nécessaires. S'ils manquent après `npm install`, installez-les explicitement :
>
> ```bash
> npm install jspdf jspdf-autotable
> ```

---

## 6. Récapitulatif : tout démarrer

| Terminal | Dossier | Commande |
| --- | --- | --- |
| 1 — Backend | `app_tfe/` (venv activé) | `uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload` |
| 2 — Frontend | `app_tfe/frontend/` | `npm start` |

Puis ouvrez <http://127.0.0.1:4200> dans votre navigateur.
(MongoDB doit tourner en arrière-plan sur le port 27017.)

---

## 7. Structure du projet

```text
app_tfe/
├── .env                    # Variables d'environnement (à créer, non versionné)
├── requirements.txt        # Dépendances Python (à compléter, voir §4.2)
├── backend/                # API FastAPI
│   ├── main.py             # Point d'entrée de l'application
│   ├── config.py           # Lecture du .env
│   ├── database.py         # Connexion MongoDB
│   ├── security.py         # JWT, hachage des mots de passe
│   ├── models/             # Schémas Pydantic (user, group, deal, audit, query, role…)
│   ├── routes/             # Endpoints (auth, users, groups, membership, deals, queries, audits…)
│   └── services/           # Logique métier (audit, PDF, planificateur)
└── frontend/               # Application Angular 17
    ├── src/                # Code source de la SPA
    ├── proxy.conf.json     # Redirection /api -> backend
    └── angular.json        # Configuration Angular (proxy déjà câblé)
```

---

## 8. Dépannage

| Problème | Cause probable | Solution |
| --- | --- | --- |
| Le backend ne démarre pas, erreur de connexion Mongo | MongoDB n'est pas lancé | Démarrer le service MongoDB (`Get-Service MongoDB` puis `Start-Service MongoDB`) |
| La connexion (`/auth/login`) renvoie **500** / impossible de se connecter (admin comme user) | `bcrypt` trop récent, incompatible avec `passlib 1.7.4` | Figer la bonne version : `pip install "bcrypt==4.0.1"` puis redémarrer le backend |
| `RuntimeError: Form data requires "python-multipart"` | Dépendance manquante | `pip install python-multipart` |
| `ModuleNotFoundError: No module named 'apscheduler'` / `reportlab` | Dépendances manquantes | `pip install apscheduler reportlab` |
| `Cannot find module 'jspdf'` à la compilation Angular | Paquets non installés dans `frontend/` | `cd frontend && npm install jspdf jspdf-autotable` |
| `ImportError: attempted relative import` / `No module named 'backend'` | Backend lancé depuis le mauvais dossier | Lancer `uvicorn` depuis la racine `app_tfe/`, pas depuis `backend/` |
| Le port 8000 ou 4200 est déjà utilisé | Une instance tourne déjà | Arrêter le processus existant ou changer de port (`--port`) |
| Les appels API du frontend échouent (404 / CORS) | Backend non démarré ou proxy non actif | Vérifier que le backend tourne sur `:8000` et lancer le frontend via `npm start` |

---

## 9. Notes de sécurité

- Changez impérativement `JWT_SECRET` en production.
- Ne versionnez jamais le fichier `.env` (déjà couvert par `.gitignore`).
- Pour Gmail, utilisez un **mot de passe d'application** pour `SMTP_PASSWORD`.
