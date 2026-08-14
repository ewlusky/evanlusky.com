export type ResumeSectionId =
  | 'about'
  | 'experience'
  | 'skills'
  | 'projects'
  | 'education'
  | 'contact';

export interface ResumeLink {
  readonly label: string;
  readonly href: string;
}

export interface ResumeEntry {
  readonly title: string;
  readonly meta?: string;
  readonly description?: string;
  readonly bullets?: readonly string[];
  readonly tags?: readonly string[];
}

export interface ResumeSection {
  readonly id: ResumeSectionId;
  readonly label: string;
  readonly gameLabel: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly introduction: string;
  readonly entries: readonly ResumeEntry[];
}

export interface ResumeData {
  readonly name: string;
  readonly shortName: string;
  readonly role: string;
  readonly location: string;
  readonly introduction: string;
  readonly email: string;
  readonly phoneDisplay: string;
  readonly phoneHref: string;
  readonly links: readonly ResumeLink[];
  readonly sections: readonly ResumeSection[];
}

export const resumeData: ResumeData = {
  name: 'Evan Wallace Lusky',
  shortName: 'Evan Lusky',
  role: 'Senior Full-Stack Engineer | AI Enablement and Platform Systems',
  location: 'Nashville, Tennessee',
  introduction:
    'Seven years delivering client-facing software across nine engagements, with a knack for finding the real failure at the seam between applications, infrastructure, documentation, and people.',
  email: 'ewlusky@gmail.com',
  phoneDisplay: '443-876-7303',
  phoneHref: '+14438767303',
  links: [
    { label: 'GitHub', href: 'https://github.com/ewlusky' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/evan-lusky' },
  ],
  sections: [
    {
      id: 'about',
      label: 'About',
      gameLabel: 'Signal Desk',
      eyebrow: '01 / Profile',
      title: 'Engineering the seams',
      introduction:
        'Evan is a senior engineer, Navy veteran, musician, researcher, and systems-minded builder. He learns unfamiliar domains quickly, makes implicit constraints explicit, and leaves behind tools and documentation that help the next person move faster.',
      entries: [
        {
          title: 'Fast context acquisition',
          description:
            'Repeatedly backfilled senior engineers on short notice across nine client codebases while maintaining client-facing delivery.',
        },
        {
          title: 'Mechanism before convention',
          description:
            'Strongest when a problem crosses ownership boundaries and requires understanding what the system actually does, not what its diagram claims it does.',
        },
        {
          title: 'Written and measurable',
          description:
            'Turns tacit knowledge into wikis, curricula, guardrails, evaluation harnesses, and clear operating agreements.',
        },
        {
          title: 'Systems people can own',
          description:
            'Fits new tooling into workflows engineers already own, with explicit boundaries, guardrails, and operating context.',
        },
      ],
    },
    {
      id: 'experience',
      label: 'Experience',
      gameLabel: 'Systems Core',
      eyebrow: '02 / Experience',
      title: 'Seven years of client-facing delivery',
      introduction:
        'Work spanning regulated healthcare, fintech, insurance, field operations, platform modernization, and AI enablement.',
      entries: [
        {
          title: 'Senior Full-Stack Software Engineer, FortyAU',
          meta: 'Nashville, TN | November 2018 to July 2026',
          bullets: [
            'Built a TEFCA clinical-data integration end to end for a Medicare care-coordination platform, with a swappable mock provider, PHI-safe errors, audit logging, and fail-fast configuration validation.',
            'Diagnosed a staging failure across application code, Terraform and ECS task definitions, and AWS Secrets Manager, then added deploy-time validation for that failure class.',
            'Built custom subagents, HIPAA gates, code-review workflows, and a self-updating engineering wiki for a regulated delivery team.',
            'Contributed 162 of 333 commits to the flagship web repository in the final quarter and 38 of 39 commits to the specs and wiki repository.',
          ],
        },
        {
          title: 'Regulated healthcare and insurance engagements',
          meta: 'Clinical data | Enterprise platforms | Medical education | Insurance',
          bullets: [
            'Migrated enterprise healthcare applications from a legacy platform into Angular and Java Spring Boot services behind a centralized departmental hub.',
            'Delivered residency-tracking and scheduling features for a fast-growing medical education platform using C#/.NET, React, and SQL Server.',
            'Built administration and broker-management tooling for a Java Spring Boot, Angular, and PostgreSQL insurance platform.',
            'Contributed to new healthtech, radiation-therapy optimization, and life-insurance modernization systems.',
          ],
        },
        {
          title: 'Fintech and field-platform modernization',
          meta: 'Lead delivery | Legacy recovery | Offline-first systems',
          bullets: [
            'Led a ground-up fintech rebuild, reverse-engineering undocumented business logic and integrating Adobe, Power BI, Microsoft 365, and SharePoint.',
            'Built an Angular 17 front end for an offline-first .NET field-work platform, including service workers, complex AG Grid workflows, and Cypress coverage.',
            'Repeatedly backfilled senior engineers on short notice while maintaining direct client-facing delivery across unfamiliar codebases.',
          ],
        },
        {
          title: 'Cryptologic Technician Interpretive, United States Navy',
          meta: '2009 to 2015 | Six years of honorable service | CTI2, E-5',
          bullets: [
            'Graduated top of class at the Defense Language Institute in Mandarin Chinese.',
            'Led a joint-service team on advanced collection systems and rewrote its training programs for a multi-branch audience.',
            'Earned the DLI Provost Award and Martin J. Kellogg Award for academic achievement and cultural understanding.',
          ],
        },
      ],
    },
    {
      id: 'skills',
      label: 'Skills',
      gameLabel: 'Tool Forge',
      eyebrow: '03 / Skills',
      title: 'Broad stack, sharp edges',
      introduction:
        'Application engineering, cloud infrastructure, AI workflows, and regulated-system practices in one working toolkit.',
      entries: [
        {
          title: 'AI enablement',
          tags: [
            'Claude',
            'MCP servers',
            'LiteLLM',
            'Subagent design',
            'Guardrails',
            'Evaluation design',
            'Workflow engineering',
          ],
        },
        {
          title: 'Backend and data',
          tags: [
            'C# / .NET',
            'Java',
            'Spring Boot',
            'Node.js',
            'REST APIs',
            'PostgreSQL',
            'SQL Server',
            'MongoDB',
          ],
        },
        {
          title: 'Frontend',
          tags: ['TypeScript', 'JavaScript', 'Angular', 'React', 'Vue.js', 'PWA', 'Responsive design'],
        },
        {
          title: 'Cloud and delivery',
          tags: ['AWS ECS Fargate', 'Aurora', 'Terraform', 'Docker', 'Azure', 'CI/CD', 'GitHub'],
        },
        {
          title: 'Quality and regulated systems',
          tags: ['Cypress', 'xUnit', 'Vitest', 'OpenAPI', 'HIPAA', 'PHI audit logging', 'FHIR / TEFCA'],
        },
        {
          title: 'Languages',
          tags: ['English, native', 'Mandarin Chinese, DLI-trained'],
        },
      ],
    },
    {
      id: 'projects',
      label: 'Projects',
      gameLabel: 'Archive Gate',
      eyebrow: '04 / Selected work',
      title: 'Systems built because they should exist',
      introduction:
        'Independent work that combines software, measurement, documentation, teaching, and a persistent appetite for unusual constraints.',
      entries: [
        {
          title: 'Personal multi-agent operations system',
          description:
            'An Obsidian-based life and project system operated by AI agents through a device bridge, with scheduled tasks, shared memory conventions, parallel research, and adversarial review passes.',
          tags: ['Agents', 'MCP', 'Obsidian', 'Automation', 'Evaluation'],
        },
        {
          title: 'Idiolect',
          description:
            'A 13-register style model built from a roughly 134,000-word personal corpus. A blind A/B harness measured 81 percent detectability against a 60 percent target, and the negative result was published instead of buried.',
          tags: ['NLP', 'Evaluation', 'Python', 'Research'],
        },
        {
          title: 'Doodle Dictionary pipeline',
          description:
            'Computer-vision and generation tooling for a printable visual dictionary: 31,500 vision-model verdicts, 5,274 extracted crops, and 1,232 classes.',
          tags: ['Computer vision', 'Moondream2', 'Flux', 'Florence-2'],
        },
        {
          title: 'Brickomancy and WorldWizard',
          description:
            'Two shipped family games built around explicit player constraints, clear rules, and collaborative imagination. Brickomancy includes a base set and 54-card expansion.',
          tags: ['Game design', 'Technical writing', 'Rapid delivery'],
        },
      ],
    },
    {
      id: 'education',
      label: 'Education',
      gameLabel: 'Learning Spire',
      eyebrow: '05 / Education',
      title: 'A documented learning machine',
      introduction:
        'Formal study across software, neuroscience, cognition, language, and recording technology, followed by continued certification and self-directed research.',
      entries: [
        {
          title: 'University of Colorado Boulder',
          bullets: [
            'B.S. Computer Science, AI focus',
            'Additional study and undergraduate research in neuroscience',
            'Certificate in Cognitive Science',
          ],
        },
        {
          title: 'Undergraduate research, University of Colorado Boulder',
          meta: 'During CU Boulder studies',
          bullets: [
            'Supported Saddoris Lab behavioral-neuroscience research on reward learning and the nucleus accumbens.',
            'Built and presented a preliminary sign-tracking model in Emergent, a biologically based neural simulation environment developed in the Computational Cognitive Neuroscience Lab.',
            'Contributed to computational cognitive-neuroscience work in the O’Reilly lab, including debugging the PBWM_Social model and presenting computational addiction research.',
          ],
        },
        {
          title: 'Defense Language Institute',
          bullets: [
            'A.A. Chinese, Mandarin',
            'Top of class with Provost and Martin J. Kellogg awards',
          ],
        },
        {
          title: 'Middle Tennessee State University',
          bullets: ['Recording technology studies'],
        },
        {
          title: 'Nashville Software School',
          bullets: ['Full-Stack Web Development Certificate'],
        },
        {
          title: 'Certifications',
          bullets: [
            'Claude Certified Architect, Professional, Anthropic, July 2026',
            'Anthropic Foundations, July 2026',
          ],
        },
      ],
    },
    {
      id: 'contact',
      label: 'Contact',
      gameLabel: 'Comms Relay',
      eyebrow: '06 / Contact',
      title: 'Start a conversation',
      introduction:
        'Evan is based in Nashville and is interested in remote-first, async-friendly engineering work centered on agentic tooling, platform systems, developer enablement, or mission-driven products.',
      entries: [
        {
          title: 'Direct',
          bullets: ['Email: ewlusky@gmail.com', 'Phone: 443-876-7303', 'Location: Nashville, Tennessee'],
        },
        {
          title: 'Elsewhere',
          bullets: [
            'GitHub: github.com/ewlusky',
            'LinkedIn: linkedin.com/in/evan-lusky',
          ],
        },
      ],
    },
  ],
};

export function getResumeSection(sectionId: ResumeSectionId): ResumeSection {
  const section = resumeData.sections.find(({ id }) => id === sectionId);

  if (!section) {
    throw new Error(`Unknown résumé section: ${sectionId}`);
  }

  return section;
}
