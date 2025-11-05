export interface VoteFinalist {
  id: string
  name: string
  organization: string
  description: string
  githubUrl?: string
}

export const voteFinalists: VoteFinalist[] = [
  {
    id: 'lifeline',
    name: 'LifeLine',
    organization: 'OpenLabs',
    description:
      "An agentic AI SaaS singularity that autonomously orchestrates cross-functional synergies, hyper-personalizes workflows, and 10x's your KPIs before you even log in.",
    githubUrl: '#',
  },
  {
    id: 'echoverse',
    name: 'EchoVerse',
    organization: 'OpenLabs',
    description:
      'A neural media studio that blends real-time simulation with generative storytelling so every user session feels uniquely cinematic.',
    githubUrl: '#',
  },
  {
    id: 'forgeflow',
    name: 'ForgeFlow',
    organization: 'OpenLabs',
    description:
      'An automation fabric that collapses your operational backlog by chaining together bespoke AI agents with zero deployment overhead.',
    githubUrl: '#',
  },
]
