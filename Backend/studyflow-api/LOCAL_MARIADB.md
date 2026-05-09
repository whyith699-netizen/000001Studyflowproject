# Local MariaDB Setup

Run these commands on Arch Linux before starting the API.

```bash
sudo pacman -S --needed mariadb
sudo mariadb-install-db --user=mysql --basedir=/usr --datadir=/var/lib/mysql
sudo systemctl enable --now mariadb.service
sudo mariadb-secure-installation
```

Create the local database and user:

```bash
sudo mariadb
```

```sql
CREATE DATABASE IF NOT EXISTS studyflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'studyflow'@'localhost' IDENTIFIED BY 'studyflow_local_password';
GRANT ALL PRIVILEGES ON studyflow.* TO 'studyflow'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Create `.env` from `.env.example`, then use:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=studyflow
DB_PASSWORD=studyflow_local_password
DB_NAME=studyflow
FIREBASE_SERVICE_ACCOUNT_PATH=./service-account.json
```

Initialize schema and migrate:

```bash
npm run init-db
npm run sync:dry-run
npm run sync -- --user=<firebase_uid>
npm run sync
npm start
```

The migration script never deletes Firestore data.
