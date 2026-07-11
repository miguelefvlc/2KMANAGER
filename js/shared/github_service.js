export function isGithubSyncEnabled() {
    return !!localStorage.getItem('gh_token') && !!localStorage.getItem('gh_owner') && !!localStorage.getItem('gh_repo');
}

export async function pushToGithub(files, commitMessage) {
    if (!isGithubSyncEnabled()) return false;

    const token = localStorage.getItem('gh_token');
    const owner = localStorage.getItem('gh_owner');
    const repo = localStorage.getItem('gh_repo');
    const branch = localStorage.getItem('gh_branch') || 'main';

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
    };

    const baseUrl = `https://api.github.com/repos/${owner}/${repo}`;

    try {
        // 1. Get current commit SHA
        const refRes = await fetch(`${baseUrl}/git/refs/heads/${branch}`, { headers });
        if (!refRes.ok) throw new Error(`Error fetching branch: ${await refRes.text()}`);
        const refData = await refRes.json();
        const commitSha = refData.object.sha;

        // 2. Get base tree SHA
        const commitRes = await fetch(`${baseUrl}/git/commits/${commitSha}`, { headers });
        if (!commitRes.ok) throw new Error(`Error fetching commit: ${await commitRes.text()}`);
        const commitData = await commitRes.json();
        const baseTreeSha = commitData.tree.sha;

        // 3. Create tree with new files
        const tree = files.map(file => ({
            path: file.path,
            mode: '100644',
            type: 'blob',
            content: file.content
        }));

        const treeRes = await fetch(`${baseUrl}/git/trees`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ base_tree: baseTreeSha, tree })
        });
        if (!treeRes.ok) throw new Error(`Error creating tree: ${await treeRes.text()}`);
        const treeData = await treeRes.json();
        const newTreeSha = treeData.sha;

        // 4. Create new commit
        const newCommitRes = await fetch(`${baseUrl}/git/commits`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                message: commitMessage,
                tree: newTreeSha,
                parents: [commitSha]
            })
        });
        if (!newCommitRes.ok) throw new Error(`Error creating commit: ${await newCommitRes.text()}`);
        const newCommitData = await newCommitRes.json();
        const newCommitSha = newCommitData.sha;

        // 5. Update reference
        const patchRes = await fetch(`${baseUrl}/git/refs/heads/${branch}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ sha: newCommitSha })
        });
        if (!patchRes.ok) throw new Error(`Error updating ref: ${await patchRes.text()}`);

        console.log('GitHub Sync OK:', newCommitSha);
        return true;
    } catch (e) {
        console.error('GitHub Sync Error:', e);
        alert('Error sincronizando con GitHub: ' + e.message);
        return false;
    }
}
