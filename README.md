# Site web interactif – Accès aux services publics dans les communes du Togo

## Lancer
    pip install -r requirements.txt
    python app.py
Ouvrir http://127.0.0.1:5000

Le site fonctionne sans connexion Internet (la bibliothèque de graphiques est incluse dans `static/js`).

## Structure
- `app.py` : serveur Flask (Python) qui prépare les données (pandas) et les expose en JSON
- `templates/index.html`, `static/css/style.css`, `static/js/app.js` : interface interactive
- `data/` : fichiers de données (communes, préfectures, agences, CNI/passeports, naissances, géométries)
