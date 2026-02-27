"use client";

import { Check } from "lucide-react";

const courses = [
  {
    title: "Personal Productivity",
    subtitle: "From manual processes and fragmented tools → to systematized personal operations that run themselves.",
    modules: [
      {
        title: "Module 1: First Principles",
        subtitle: "How automation thinks",
        lessons: ["Introduction to Workflow Thinking", "Your First Automation", "Connecting Services", "Working with Data"],
      },
      {
        title: "Module 2: Building Blocks",
        subtitle: "The patterns behind every workflow",
        lessons: ["Triggers and Schedules", "When Things Go Wrong", "Complex Data Structures", "Processing Different Formats"],
      },
      {
        title: "Module 3: Production Ready",
        subtitle: "From working to reliable",
        lessons: ["Building Resilient Workflows", "Multi-Step Architectures", "Monitoring What You Build", "Going to Production"],
      },
    ],
    outcomes: [
      "A personal operating system of automated workflows",
      "Instincts for identifying and systematizing any process",
      "Fluency with modern automation tools and patterns",
    ],
  },
  {
    title: "Business Operations",
    subtitle: "From individual automation competence → to organizational capability across teams and systems.",
    modules: [
      {
        title: "Module 1: Process Design",
        subtitle: "From business need to automation blueprint",
        lessons: ["Mapping Processes", "Finding Automation Opportunities", "Building the Business Case", "Designing for Scale"],
      },
      {
        title: "Module 2: Enterprise Integrations",
        subtitle: "Connecting the systems that run your business",
        lessons: ["CRM Workflows", "Finance and Operations", "Working with Databases", "Communication Flows"],
      },
      {
        title: "Module 3: Production & Compliance",
        subtitle: "Automations that organizations can trust",
        lessons: ["Security and Access", "Audit and Recovery", "Performance at Scale", "Maintenance and Evolution"],
      },
    ],
    outcomes: [
      "Process design methodology for any scale",
      "Cross-functional integration skills",
      "Operations governance instincts",
    ],
  },
];

export function CoursesSection() {
  return (
    <section id="courses" className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 bg-muted/30" />

      <div className="container relative mx-auto px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              The Courses
            </h2>
          </div>

          <div className="space-y-16">
            {courses.map((course, courseIndex) => (
              <div
                key={course.title}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
              >
                <div className="border-b border-border bg-gradient-to-br from-primary/5 to-transparent p-8">
                  <div className="mb-2 text-sm font-medium text-primary">Course {courseIndex + 1}</div>
                  <h3 className="font-display text-2xl font-semibold sm:text-3xl">{course.title}</h3>
                  <p className="mt-3 text-lg italic text-muted-foreground">{course.subtitle}</p>
                </div>

                <div className="divide-y divide-border">
                  {course.modules.map((module) => (
                    <div key={module.title} className="p-8">
                      <div className="mb-4">
                        <h4 className="font-display text-lg font-semibold">{module.title}</h4>
                        <p className="mt-1 text-sm text-muted-foreground">{module.subtitle}</p>
                      </div>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {module.lessons.map((lesson) => (
                          <li key={lesson} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="mt-0.5 text-primary">•</span>
                            <span>{lesson}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border bg-muted/30 p-8">
                  <h4 className="mb-4 font-display text-lg font-semibold">You&apos;ll develop:</h4>
                  <ul className="space-y-2">
                    {course.outcomes.map((outcome) => (
                      <li key={outcome} className="flex items-start gap-3">
                        <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-success" />
                        <span className="text-muted-foreground">{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
