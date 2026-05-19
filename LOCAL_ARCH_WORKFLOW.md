# StudyFlow Local Arch Workflow

This setup mirrors the server Docker stack for local update and debugging on Arch Linux.

## Start Docker

```bash
systemctl start docker
```

Optional, to start Docker automatically after reboot:

```bash
systemctl enable docker
```

## Run The Full Stack

From the project root:

```bash
cd /home/archgha99/Disk2/001Code/000001Studyflowproject
docker compose up -d --build
```

Services:

- Frontend: http://localhost/
- API health: http://localhost:3000/health
- phpMyAdmin: http://localhost:8080/
- MariaDB: `studyflow-db` inside Docker network

Database login for phpMyAdmin follows `.env`:

- Server: `db`
- User: `studyflow`
- Password: `studyflow_local_password`
- Database: `studyflow`

## Daily Debug Commands

```bash
docker compose ps
docker compose logs -f api
docker compose logs -f frontend
docker compose logs -f db
docker compose down
```

After changing frontend or backend code:

```bash
docker compose up -d --build
```

## Sync To Server

After local testing:

```bash
git status
git add .
git commit -m "Update StudyFlow"
git push
```

On the server:

```bash
cd /root/studyflow-full
git pull
docker compose up -d --build
```

## Database Sync

Export SQL from server phpMyAdmin, then import it into local phpMyAdmin at http://localhost:8080/.

To reset only the local Docker database volume:

```bash
docker compose down -v
docker compose up -d --build
```
