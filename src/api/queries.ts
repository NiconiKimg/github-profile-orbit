export const USER_ECOSYSTEM_QUERY = `
  query getUserEcosystem($login: String!) {
    user(login: $login) {
      login
      name
      bio
      avatarUrl
      createdAt
      followers {
        totalCount
      }
      following {
        totalCount
      }
      contributionsCollection {
        totalCommitContributions
        restrictedContributionsCount
      }
      repositories(
        first: 100
        ownerAffiliations: [OWNER]
        orderBy: { field: PUSHED_AT, direction: DESC }
        privacy: PUBLIC
      ) {
        nodes {
          id
          name
          isFork
          isArchived
          isPrivate
          stargazerCount
          forkCount
          pushedAt
          description
          primaryLanguage {
            name
            color
          }
          languages(first: 8, orderBy: { field: SIZE, direction: DESC }) {
            edges {
              size
              node {
                name
                color
              }
            }
          }
          repositoryTopics(first: 8) {
            nodes {
              topic {
                name
              }
            }
          }
        }
      }
    }
  }
`;
