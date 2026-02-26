import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { getCourseFormResponse, submitCourseFormResponse } from '@/lib/data';

export async function GET(req: Request) {
  try {
    const { user } = await auth();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');
    const formType = searchParams.get('formType') as 'onboarding' | 'completion' | null;

    if (!courseId || !formType || !['onboarding', 'completion'].includes(formType)) {
      return NextResponse.json({ error: 'Missing or invalid params' }, { status: 400 });
    }

    const submitted = await getCourseFormResponse(user.id, courseId, formType);
    return NextResponse.json({ submitted });
  } catch (error) {
    console.error('GET course form-response error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user } = await auth();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { courseId, formType, responses } = await req.json();

    if (
      !courseId ||
      !formType ||
      !['onboarding', 'completion'].includes(formType) ||
      typeof responses !== 'object' ||
      responses === null
    ) {
      return NextResponse.json({ error: 'Missing or invalid params' }, { status: 400 });
    }

    await submitCourseFormResponse(user.id, courseId, formType, responses);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST course form-response error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
