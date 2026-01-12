# Database Plan for Modular Course Platform

This document outlines the data entity structure for the modular course platform, focusing on simplicity and clarity for the initial build.

## Core Hierarchy

The learning content is organized in a hierarchical manner:
**Course** → **Module** → **ModuleItem** (which can be a Lesson or a Quiz)

*   A **Module** acts as a container for an ordered list of `ModuleItem`s.
*   A **ModuleItem** is a polymorphic entity that points to either a `Lesson` or a `Quiz`, allowing them to coexist as ordered peers within a module.

---

## Data Entities

### 1. User
Represents an individual learner on the platform.
*   `userId` (Primary Key)
*   `name` (String)
*   `email` (String, Unique)
*   `profilePictureUrl` (String, Optional)
*   `createdAt` (Timestamp)
*   `updatedAt` (Timestamp)

### 2. Course
The top-level container for a learning path, composed of modules.
*   `courseId` (Primary Key)
*   `title` (String)
*   `description` (Text)
*   `thumbnailUrl` (String, Optional)
*   `authorName` (String, for display purposes, e.g., "AI Assistant")
*   `category` (String, e.g., "Programming", "Design")
*   `createdAt` (Timestamp)
*   `updatedAt` (Timestamp)

### 3. Module
A logical grouping of `ModuleItem`s within a course.
*   `moduleId` (Primary Key)
*   `courseId` (Foreign Key to `Course`)
*   `title` (String)
*   `order` (Integer, for ordering modules within a course)
*   `createdAt` (Timestamp)
*   `updatedAt` (Timestamp)

### 4. ModuleItem
A polymorphic entity that represents an ordered entry within a `Module`, pointing to either a `Lesson` or a `Quiz`.
*   `itemId` (Primary Key)
*   `moduleId` (Foreign Key to `Module`)
*   `order` (Integer, for ordering items within a module)
*   `itemType` (Enum: 'lesson', 'quiz')
*   `lessonId` (Foreign Key to `Lesson`, Nullable - set if `itemType` is 'lesson')
*   `quizId` (Foreign Key to `Quiz`, Nullable - set if `itemType` is 'quiz')
*   `createdAt` (Timestamp)
*   `updatedAt` (Timestamp)
*   *(Constraint: Exactly one of `lessonId` or `quizId` must be non-null)*

### 5. Lesson
A content-based learning unit, primarily composed of Markdown text.
*   `lessonId` (Primary Key)
*   `title` (String)
*   `markdownContent` (Text - stores the lesson content in Markdown format)
*   `createdAt` (Timestamp)
*   `updatedAt` (Timestamp)

### 6. Quiz
A standalone assessment unit, composed of a set of questions.
*   `quizId` (Primary Key)
*   `title` (String)
*   `description` (Text, Optional)
*   `createdAt` (Timestamp)
*   `updatedAt` (Timestamp)

### 7. Question
A single question within a quiz.
*   `questionId` (Primary Key)
*   `quizId` (Foreign Key to `Quiz`)
*   `order` (Integer, for ordering questions within a quiz)
*   `statement` (Text - the actual question text)
*   `createdAt` (Timestamp)
*   `updatedAt` (Timestamp)

### 8. AnswerOption
An answer choice for a given question.
*   `optionId` (Primary Key)
*   `questionId` (Foreign Key to `Question`)
*   `text` (String - the answer option text)
*   `hintLabel` (String - a label or short hint for the option, e.g., "A", "B", "C", "D")
*   `isCorrect` (Boolean - indicates if this is the correct answer for 'single-choice-mcq')
*   `createdAt` (Timestamp)
*   `updatedAt` (Timestamp)

---

## Progress and Activity Tracking

### 9. Enrollment
Records a user's enrollment in a specific course.
*   `enrollmentId` (Primary Key)
*   `userId` (Foreign Key to `User`)
*   `courseId` (Foreign Key to `Course`)
*   `enrollmentDate` (Timestamp)
*   `completionDate` (Timestamp, Nullable - set when course is completed)
*   `status` (Enum: 'in-progress', 'completed', 'dropped')
*   `createdAt` (Timestamp)
*   `updatedAt` (Timestamp)

### 10. UserModuleItemProgress
Tracks a user's completion status for each `ModuleItem`.
*   `progressId` (Primary Key)
*   `userId` (Foreign Key to `User`)
*   `itemId` (Foreign Key to `ModuleItem`)
*   `completedAt` (Timestamp, Nullable - set when the item is completed)
*   `status` (Enum: 'not-started', 'in-progress', 'completed')
*   `createdAt` (Timestamp)
*   `updatedAt` (Timestamp)

### 11. QuizAttempt
Records each instance a user attempts a quiz.
*   `attemptId` (Primary Key)
*   `quizId` (Foreign Key to `Quiz`)
*   `userId` (Foreign Key to `User`)
*   `startedAt` (Timestamp)
*   `completedAt` (Timestamp, Nullable - set when quiz is finished)
*   `score` (Integer, Nullable - e.g., percentage or points)
*   `createdAt` (Timestamp)
*   `updatedAt` (Timestamp)

### 12. UserAnswer
Records a user's selected answer for a specific question within a quiz attempt.
*   `userAnswerId` (Primary Key)
*   `attemptId` (Foreign Key to `QuizAttempt`)
*   `questionId` (Foreign Key to `Question`)
*   `selectedOptionId` (Foreign Key to `AnswerOption` - the option the user selected)
*   `createdAt` (Timestamp)
*   `updatedAt` (Timestamp)
