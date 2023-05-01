const core = require('@actions/core');
const { Octokit } = require('@octokit/core');
const { paginateRest } = require('@octokit/plugin-paginate-rest');

const token = core.getInput("github_token", { required: true })
const [owner, repo] = core.getInput("repo", { required: true }).split("/")
const branch = core.getInput("branch", { required: true })
const regex = core.getInput("regex", { required: true })

const OctoPag = Octokit.plugin(paginateRest);
const octokit = new OctoPag({ auth: token });

const apiVersion = '2022-11-28';
const headers = { 'X-GitHub-Api-Version': apiVersion };

async function main() {
  try {
    const artifacts = await listArtifacts(matchesRegexAndBranch);
    core.info(`==> got artifacts: ${artifacts.length} items:`);

    for (const artifact of artifacts) {
      await deleteArtifact(artifact);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();

function matchesRegexAndBranch(artifact) {
  return artifact.name.match(regex) && artifact.workflow_run.head_branch === branch;
}

async function listArtifacts(filterFunc) {
  const artifacts = await octokit.paginate(`GET /repos/${owner}/${repo}/actions/artifacts`, {
    per_page: 100,
    headers,
  });

  artifacts.forEach((artifact) => {
    core.info(
      `==> found artifact: id: ${artifact.id} name: ${artifact.name} size: ${artifact.size_in_bytes} branch: ${artifact.workflow_run.head_branch} expired: ${artifact.expired}`
    );
  });

  return artifacts.filter(filterFunc);
}

async function deleteArtifact(artifact) {
  core.info(
    ` - deleted> id: ${artifact.id} name: ${artifact.name} size: ${artifact.size_in_bytes} branch: ${artifact.workflow_run.head_branch} expired: ${artifact.expired}`
  );

  await octokit.request(`DELETE /repos/${owner}/${repo}/actions/artifacts/${artifact.id}`, {
    headers,
  });
}
