Branch Rules

master → stable code only (production-ready).

dev → integration branch (where all features get merged first).

feature/* → your personal work branch.

⚠️ Never push directly to master or dev. Always work in a feature/* branch.

🔹 1. Clone the Repo (first time only)
git clone https://github.com/Zive2001/microLearn.git
cd microLearn

🔹 2. Always Start From dev
git checkout dev
git pull origin dev

🔹 3. Create Your Own Branch

Branch name format:

feature/<task>
bugfix/<task>
experiment/<task>


Examples:

git checkout -b feature/frontend-dashboard
git checkout -b feature/ml-model
git checkout -b bugfix/login-error

🔹 4. Do Your Work

Add/edit code in the correct folder (frontend/ or backend/).

Don’t commit .env or secrets.

Commit often with meaningful messages.

Example:

git add .
git commit -m "Added login API in backend"

🔹 5. Push Your Branch
git push origin feature/frontend-dashboard

🔹 6. Open a Pull Request (PR)

Go to GitHub → Pull requests
 → New Pull Request.

Base branch = dev
Compare branch = your feature/*

Title: Feature: frontend dashboard

Description: explain what you did.

Click Create Pull Request.

🔹 7. Get Reviewed

Another member reviews your code.

If changes are requested:

git add .
git commit -m "Fix: updated login API error handling"
git push origin feature/frontend-dashboard


→ The PR updates automatically.

🔹 8. Merging

After approval → PR merged into dev.

When dev is tested and stable → project lead merges dev → master.

🔹 9. Sync Regularly

Before starting new work:

git checkout dev
git pull origin dev


If your branch is behind dev:

git checkout feature/frontend-dashboard
git merge dev
# fix conflicts if needed
git push origin feature/frontend-dashboard

🔹 10. Golden Rules

❌ Don’t push to master or dev.

❌ Don’t commit .env or credentials.

✅ Use clear branch names (feature/auth-system, not radul-test).

✅ Commit small, meaningful changes.

✅ Always PR into dev.
