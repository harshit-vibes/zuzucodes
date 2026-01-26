import { Hero, Outcomes, Curriculum, LessonFormat, Footer } from '@/components';
import { getDefaultCourse } from '@/lib/data';

export default function Home() {
  const course = getDefaultCourse();

  return (
    <main className="min-h-screen">
      <Hero course={course} />
      <Outcomes outcomes={course.outcomes} />
      <Curriculum modules={course.modules} />
      <LessonFormat />
      <Footer />
    </main>
  );
}
