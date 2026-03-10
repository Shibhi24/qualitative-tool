import os
import subprocess

env = os.environ.copy()
env["FILTER_BRANCH_SQUELCH_WARNING"] = "1"

script = """
if [ "$GIT_COMMITTER_EMAIL" = "hariarul107@gmail.com" ]
then
    export GIT_COMMITTER_NAME="shibhi24"
    export GIT_COMMITTER_EMAIL="shibhi24@users.noreply.github.com"
fi
if [ "$GIT_AUTHOR_EMAIL" = "hariarul107@gmail.com" ]
then
    export GIT_AUTHOR_NAME="shibhi24"
    export GIT_AUTHOR_EMAIL="shibhi24@users.noreply.github.com"
fi
"""

cmd = [
    "git", "filter-branch", "-f", "--env-filter",
    script,
    "--tag-name-filter", "cat", "--", "--branches", "--tags"
]

result = subprocess.run(cmd, env=env, cwd=r"f:\qualitative-tool-bkd", capture_output=True, text=True)
print("STDOUT:", result.stdout)
print("STDERR:", result.stderr)
