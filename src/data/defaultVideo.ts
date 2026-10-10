import type { Lesson } from '../types'

/**
 * Initial starter YouTube video for first-time application load.
 * Users can practice immediately or paste any YouTube URL to replace or add new videos.
 */
export const DEFAULT_YOUTUBE_VIDEOS: Lesson[] = [
  {
    id: 'video-UF8uR6Z6KLc',
    title: 'Steve Jobs: Connecting the Dots (Stanford 2005)',
    videoId: 'UF8uR6Z6KLc',
    language: 'English (US)',
    transcriptSource: 'YouTube Video Transcript',
    isVerified: true,
    level: 'Intermediate',
    description: 'Bài phát biểu nổi tiếng của Steve Jobs tại Stanford, thích hợp cho việc luyện nghe câu và phát âm chuẩn Mỹ.',
    sentences: [
      {
        id: 'seg-1',
        startTime: 24,
        endTime: 30,
        text: 'I am honored to be with you today at your commencement from one of the finest universities in the world.',
        translation: 'Tôi rất vinh dự được có mặt cùng các bạn hôm nay tại lễ tốt nghiệp từ một trong những trường đại học tốt nhất trên thế giới.',
        hint: 'honored, commencement, finest universities',
      },
      {
        id: 'seg-2',
        startTime: 30,
        endTime: 36,
        text: "I never graduated from college. Truth be told, this is the closest I've ever gotten to a college graduation.",
        translation: 'Tôi chưa từng tốt nghiệp đại học. Thật lòng mà nói, đây là dịp gần nhất tôi từng đến với một lễ tốt nghiệp đại học.',
        hint: 'graduated, truth be told, graduation',
      },
      {
        id: 'seg-3',
        startTime: 37,
        endTime: 44,
        text: "Today I want to tell you three stories from my life. That's it. No big deal. Just three stories.",
        translation: 'Hôm nay tôi muốn kể cho các bạn nghe ba câu chuyện từ cuộc đời tôi. Chỉ vậy thôi. Không có gì to tát. Chỉ ba câu chuyện.',
        hint: 'three stories, no big deal',
      },
      {
        id: 'seg-4',
        startTime: 44,
        endTime: 50,
        text: 'The first story is about connecting the dots.',
        translation: 'Câu chuyện đầu tiên là về việc kết nối các dấu chấm.',
        hint: 'connecting the dots',
      },
      {
        id: 'seg-5',
        startTime: 51,
        endTime: 58,
        text: 'I dropped out of Reed College after the first six months, but then stayed around as a drop-in for another 18 months or so before I really quit.',
        translation: 'Tôi bỏ học tại trường Cao đẳng Reed sau sáu tháng đầu, nhưng rồi vẫn nán lại dự thính thêm khoảng 18 tháng trước khi thực sự nghỉ hẳn.',
        hint: 'dropped out, stayed around, drop-in, quit',
      },
    ],
  },
]
