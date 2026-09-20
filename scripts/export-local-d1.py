#!/usr/bin/env python3
"""Export only league tables from a read-only SQLite snapshot. Never exports auth credentials."""
import sqlite3, json, sys
from pathlib import Path
TABLES='players seasons settings player_attributes matches teams match_players match_player_stats match_events videos season_awards player_awards award_definitions award_identities award_votes recognition_seasons'.split()
if len(sys.argv)!=3:raise SystemExit('Usage: python3 scripts/export-local-d1.py source.sqlite backup.json')
source=Path(sys.argv[1]).resolve(); destination=Path(sys.argv[2])
if destination.exists():raise SystemExit('La sauvegarde existe déjà : choisir un nouveau fichier.')
connection=sqlite3.connect(source.as_uri()+'?mode=ro',uri=True)
connection.row_factory=sqlite3.Row
with connection:
 data={name:[dict(row) for row in connection.execute('SELECT * FROM '+name)] for name in TABLES}
destination.write_text(json.dumps({'format':'copro-raw-v1','tables':data},ensure_ascii=False,indent=2))
destination.chmod(0o600)
print('Sauvegarde créée : '+str(destination))
print({name:len(rows) for name,rows in data.items()})
