# Garage mit fest eingebetteter Konfiguration (ADR 0013).
#
# Hintergrund: Coolify (und manche Compose-Setups) legen die Quelle eines
# Bind-Mounts vorsorglich als Verzeichnis an, wenn sie nicht als Datei
# existiert. Ein Einzeldatei-Mount `./infra/garage/garage.toml:/etc/garage.toml`
# wird dadurch zum Verzeichnis – Garage bricht beim Laden der Konfiguration mit
# „IO error: Is a directory" ab. Statt des fragilen Mounts kopieren wir die
# Konfiguration daher reproduzierbar ins Image.
FROM dxflrs/garage:v1.0.1
COPY garage.toml /etc/garage.toml
