'use client';

import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';

interface Module {
  title: string;
  subtitle: string;
  lessons: string[];
}

interface Course {
  id: string;
  title: string;
  arc: string;
  modules: Module[];
  outcomes: string;
}

const courses: Course[] = [
  {
    id: 'personal',
    title: 'Personal Productivity',
    arc: 'From manual processes and fragmented tools to systematized personal operations that run themselves.',
    modules: [
      {
        title: 'First Principles',
        subtitle: 'How automation thinks',
        lessons: [
          'Introduction to Workflow Thinking',
          'Your First Automation',
          'Connecting Services',
          'Working with Data',
        ],
      },
      {
        title: 'Building Blocks',
        subtitle: 'The patterns behind every workflow',
        lessons: [
          'Triggers and Schedules',
          'When Things Go Wrong',
          'Complex Data Structures',
          'Processing Different Formats',
        ],
      },
      {
        title: 'Production Ready',
        subtitle: 'From working to reliable',
        lessons: [
          'Building Resilient Workflows',
          'Multi-Step Architectures',
          'Monitoring What You Build',
          'Going to Production',
        ],
      },
    ],
    outcomes: 'A personal operating system of automated workflows. Instincts for identifying and systematizing any process. Fluency with modern automation tools and patterns.',
  },
  {
    id: 'business',
    title: 'Business Operations',
    arc: 'From individual automation competence to organizational capability across teams and systems.',
    modules: [
      {
        title: 'Process Design',
        subtitle: 'From business need to automation blueprint',
        lessons: [
          'Mapping Processes',
          'Finding Automation Opportunities',
          'Building the Business Case',
          'Designing for Scale',
        ],
      },
      {
        title: 'Enterprise Integrations',
        subtitle: 'Connecting the systems that run your business',
        lessons: [
          'CRM Workflows',
          'Finance and Operations',
          'Working with Databases',
          'Communication Flows',
        ],
      },
      {
        title: 'Production & Compliance',
        subtitle: 'Automations that organizations can trust',
        lessons: [
          'Security and Access',
          'Audit and Recovery',
          'Performance at Scale',
          'Maintenance and Evolution',
        ],
      },
    ],
    outcomes: 'Process design methodology for any scale. Cross-functional integration skills. Operations governance instincts.',
  },
];

function Accordion({ modules }: { modules: Module[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-4">
      {modules.map((module, i) => (
        <div
          key={i}
          className="accordion-item"
          data-state={openIndex === i ? 'open' : 'closed'}
        >
          <button
            className="accordion-trigger"
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
          >
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <span className="number flex-shrink-0">Module {i + 1}</span>
              <div className="min-w-0">
                <h4 className="heading-md text-[var(--text-primary)] text-left truncate">
                  {module.title}
                </h4>
                <p className="body-sm text-[var(--text-secondary)] truncate">
                  {module.subtitle}
                </p>
              </div>
            </div>
            <span className="accordion-icon">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                {openIndex === i ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                )}
              </svg>
            </span>
          </button>

          <AnimatePresence>
            {openIndex === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="accordion-content">
                  <div className="grid gap-3">
                    {module.lessons.map((lesson, j) => (
                      <div
                        key={j}
                        className="flex items-center gap-3 sm:gap-4 py-2 border-b border-[var(--border-subtle)] last:border-b-0"
                      >
                        <span className="mono-md text-[var(--text-muted)] w-6 flex-shrink-0">
                          {String(j + 1).padStart(2, '0')}
                        </span>
                        <span className="body-md text-[var(--text-secondary)]">
                          {lesson}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export function CoursesSection() {
  const [activeTab, setActiveTab] = useState<string>('personal');

  const activeCourse = courses.find((c) => c.id === activeTab) || courses[0];

  return (
    <section id="courses" className="section bg-[var(--bg-surface)]">
      <div className="w-full max-w-[720px]">
        {/* Section header - using standardized component */}
        <SectionHeader
          tag="The Courses"
          headline="Your learning path"
          align="center"
        />

        {/* Tab Switcher */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex justify-center mb-[var(--content-gap)]"
        >
          <div className="tab-list">
            {courses.map((course) => (
              <button
                key={course.id}
                className="tab-trigger"
                data-state={activeTab === course.id ? 'active' : ''}
                onClick={() => setActiveTab(course.id)}
              >
                {course.title}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Arc statement */}
            <motion.p
              className="body-lg text-[var(--text-secondary)] text-center mb-[var(--content-gap)] italic"
            >
              {activeCourse.arc}
            </motion.p>

            {/* Accordion modules */}
            <Accordion modules={activeCourse.modules} />

            {/* Outcomes - using Card component */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-[var(--content-gap)]"
            >
              <Card padding="md" context="on-surface">
                <h4 className="heading-md text-[var(--text-primary)] mb-3">
                  You&apos;ll develop
                </h4>
                <p className="body-md text-[var(--text-secondary)]">
                  {activeCourse.outcomes}
                </p>
              </Card>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
