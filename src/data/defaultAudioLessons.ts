import type { Lesson, SentenceSegment, VoiceAccent } from '../types'
import { estimateSentenceDuration } from '../lib/audio/textToLesson'
import { extractSpeakerFromSegment } from '../lib/audio/dialogueVoices'

interface RawAudioSentence {
  text: string
  translation: string
  hint?: string
}

interface RawAudioLessonSpec {
  id: string
  videoId: string
  title: string
  description: string
  voiceAccent: VoiceAccent
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  items: RawAudioSentence[]
}

/**
 * Legacy and uncompleted preset IDs retired so they are automatically purged
 * from LocalStorage & Cloud D1 and never resurrected on sync.
 */
export const RETIRED_PRESET_AUDIO_IDS: ReadonlySet<string> = new Set([
  'lesson-audio-b1b2-01',
  'lesson-audio-b1b2-02',
  'lesson-audio-b1b2-03',
  'lesson-audio-b1b2-04',
  'lesson-audio-b1b2-05',
  'lesson-audio-b1b2-06',
  'lesson-audio-b1b2-07',
  'lesson-audio-b1b2-08',
  'lesson-audio-b1b2-09',
  'lesson-audio-b1b2-10',
  'audio-b1b2-01',
  'audio-b1b2-02',
  'audio-b1b2-03',
  'audio-b1b2-04',
  'audio-b1b2-05',
  'audio-b1b2-06',
  'audio-b1b2-07',
  'audio-b1b2-08',
  'audio-b1b2-09',
  'audio-b1b2-10',
  'lesson-audio-itops-01',
  'lesson-audio-itops-02',
  'lesson-audio-itops-03',
  'lesson-audio-itops-04',
  'lesson-audio-itops-05',
  'lesson-audio-itops-06',
  'lesson-audio-itops-07',
  'lesson-audio-itops-08',
  'lesson-audio-itops-09',
  'lesson-audio-itops-10',
  'audio-itops-01',
  'audio-itops-02',
  'audio-itops-03',
  'audio-itops-04',
  'audio-itops-05',
  'audio-itops-06',
  'audio-itops-07',
  'audio-itops-08',
  'audio-itops-09',
  'audio-itops-10',
  'lesson-audio-itops-a2-11',
  'lesson-audio-itops-a2-13',
  'lesson-audio-itops-a2-15',
  'lesson-audio-itops-a2-16',
  'audio-itops-a2-11',
  'audio-itops-a2-13',
  'audio-itops-a2-15',
  'audio-itops-a2-16',
])

function buildLesson(spec: RawAudioLessonSpec): Lesson {
  let cursor = 0
  const sentences: SentenceSegment[] = spec.items.map((item, idx) => {
    const duration = estimateSentenceDuration(item.text)
    const startTime = Math.round(cursor * 10) / 10
    const endTime = Math.round((cursor + duration) * 10) / 10
    cursor = endTime
    const detectedSpeaker = extractSpeakerFromSegment({
      translation: item.translation,
      hint: item.hint,
    })
    return {
      id: `${spec.videoId}-seg-${idx + 1}`,
      startTime,
      endTime,
      text: item.text,
      translation: item.translation,
      hint: item.hint,
      ...(detectedSpeaker ? { speaker: detectedSpeaker } : {}),
    }
  })

  return {
    id: spec.id,
    videoId: spec.videoId,
    sourceType: 'audio',
    voiceAccent: spec.voiceAccent,
    title: spec.title,
    description: spec.description,
    language: 'en',
    level: spec.level,
    transcriptSource: 'ListenFlow IT Ops Audio Studio',
    isVerified: true,
    sentences,
  }
}

const RAW_IT_OPS_A2_B1_SPECS: RawAudioLessonSpec[] = [
  {
    id: 'lesson-audio-itops-a2-01',
    videoId: 'audio-itops-a2-01',
    title: 'A2-B1 | 01. Morning Server Check & Handover (IT Ops)',
    description:
      'Simple shift handover between two junior operators checking server status, alerts, and daily tickets (~1 min, A2-B1, UK English).',
    voiceAccent: 'en-GB',
    level: 'Beginner',
    items: [
      {
        text: 'Good morning Ben, how was the night shift in the server room?',
        translation: '[Ca sáng] Chào buổi sáng Ben, ca trực đêm ở phòng máy chủ thế nào?',
        hint: 'night shift, server room',
      },
      {
        text: 'It was very quiet, and all main servers are running normally today.',
        translation:
          '[Ca đêm] Rất yên tĩnh, và tất cả máy chủ chính hôm nay đều đang chạy bình thường.',
        hint: 'quiet, running normally',
      },
      {
        text: 'Did we get any red alerts on the monitoring screen last night?',
        translation: '[Ca sáng] Đêm qua màn hình giám sát có báo cảnh báo đỏ nào không?',
        hint: 'alerts, monitoring screen',
      },
      {
        text: 'We had one yellow warning on mail server two around three in the morning.',
        translation:
          '[Ca đêm] Ta có một cảnh báo vàng ở máy chủ thư số hai vào khoảng ba giờ sáng.',
        hint: 'warning, mail server',
      },
      {
        text: 'What caused that warning, and did you need to restart the machine?',
        translation: '[Ca sáng] Nguyên nhân cảnh báo là gì, cậu có cần khởi động lại máy không?',
        hint: 'caused, restart',
      },
      {
        text: 'The memory was briefly high during a backup job, then it went back to normal.',
        translation:
          '[Ca đêm] Bộ nhớ tăng cao một lúc khi chạy sao lưu, sau đó tự trở lại bình thường.',
        hint: 'briefly, backup job, normal',
      },
      {
        text: 'Great, are there any open support tickets waiting for the morning team?',
        translation: '[Ca sáng] Tốt quá, còn phiếu hỗ trợ nào đang mở chờ ca sáng xử lý không?',
        hint: 'support tickets, waiting',
      },
      {
        text: 'Only two small printer requests, and I already wrote short notes in our logbook.',
        translation:
          '[Ca đêm] Chỉ còn hai yêu cầu máy in nhỏ thôi, mình đã ghi chú ngắn vào sổ trực rồi.',
        hint: 'requests, notes, logbook',
      },
      {
        text: 'Thanks for the clear handover, Ben; go home and get some good rest.',
        translation: '[Ca sáng] Cảm ơn bàn giao rõ ràng nhé Ben; về nhà nghỉ ngơi cho khỏe đi.',
        hint: 'handover, rest',
      },
    ],
  },
  {
    id: 'lesson-audio-itops-a2-02',
    videoId: 'audio-itops-a2-02',
    title: 'A2-B1 | 02. Locked Account & Password Reset Call (IT Support)',
    description:
      'Everyday IT helpdesk phone call helping a staff member unlock an account and set a safe password (~1 min, A2-B1, UK English).',
    voiceAccent: 'en-GB',
    level: 'Beginner',
    items: [
      {
        text: 'Hello, IT helpdesk speaking; how can I help you this morning?',
        translation:
          '[Helpdesk] Xin chào, bộ phận hỗ trợ IT nghe ạ; sáng nay tôi có thể giúp gì cho bạn?',
        hint: 'helpdesk, speaking',
      },
      {
        text: 'Hi, I cannot sign in to my work email because my account is locked.',
        translation:
          '[Nhân viên] Chào bạn, tôi không đăng nhập được email công ty vì tài khoản bị khóa rồi.',
        hint: 'sign in, locked',
      },
      {
        text: 'Do not worry, I can unlock it for you in just a few minutes.',
        translation: '[Helpdesk] Đừng lo, tôi có thể mở khóa giúp bạn chỉ trong vài phút.',
        hint: 'unlock, a few minutes',
      },
      {
        text: 'First, could you please tell me your full name and employee number?',
        translation:
          '[Helpdesk] Trước tiên, bạn vui lòng cho tôi biết họ tên đầy đủ và mã nhân viên nhé?',
        hint: 'full name, employee number',
      },
      {
        text: 'Sure, my name is Claire Evans, and my number is four zero eight two.',
        translation: '[Nhân viên] Được ạ, tôi tên Claire Evans, mã nhân viên là 4082.',
        hint: 'number',
      },
      {
        text: 'Thank you Claire; I see five wrong password attempts on your login screen.',
        translation:
          '[Helpdesk] Cảm ơn Claire; tôi thấy có năm lần nhập sai mật khẩu trên màn hình đăng nhập của bạn.',
        hint: 'wrong password, attempts, login screen',
      },
      {
        text: 'Yes, my keyboard had caps lock turned on, so I typed it wrong.',
        translation:
          '[Nhân viên] Đúng rồi, bàn phím tôi đang bật phím viết hoa nên tôi gõ sai.',
        hint: 'keyboard, caps lock, typed',
      },
      {
        text: 'I have unlocked your account and sent a temporary link to your phone.',
        translation:
          '[Helpdesk] Tôi đã mở khóa tài khoản và gửi một đường dẫn tạm thời tới điện thoại của bạn.',
        hint: 'temporary link',
      },
      {
        text: 'Please choose a strong new password with letters and numbers, then try again.',
        translation:
          '[Helpdesk] Bạn hãy chọn mật khẩu mới mạnh có cả chữ và số rồi thử đăng nhập lại nhé.',
        hint: 'strong password, letters, numbers',
      },
    ],
  },
  {
    id: 'lesson-audio-itops-a2-03',
    videoId: 'audio-itops-a2-03',
    title: 'A2-B1 | 03. Slow Office WiFi & Router Restart (IT Support)',
    description:
      'Practical workplace call diagnosing slow internet on the third floor, checking cables, and restarting the router (~1 min, A2-B1, UK English).',
    voiceAccent: 'en-GB',
    level: 'Beginner',
    items: [
      {
        text: 'Hi Sam, the internet on the third floor is very slow this afternoon.',
        translation: '[Nhân viên] Chào Sam, mạng internet ở tầng ba chiều nay rất chậm.',
        hint: 'third floor, slow',
      },
      {
        text: 'Is it slow only on your laptop, or are your colleagues having trouble too?',
        translation:
          '[IT Support] Chỉ chậm trên máy tính xách tay của bạn hay đồng nghiệp cũng gặp trục trặc?',
        hint: 'laptop, colleagues, having trouble',
      },
      {
        text: 'Everyone near the meeting room keeps losing their video calls every few minutes.',
        translation:
          '[Nhân viên] Mọi người gần phòng họp đều cứ bị rớt cuộc gọi video sau vài phút.',
        hint: 'meeting room, losing, video calls',
      },
      {
        text: 'Let me check the network panel; the wireless router on your floor looks busy.',
        translation:
          '[IT Support] Để tôi kiểm tra bảng điều khiển mạng; bộ phát WiFi ở tầng bạn có vẻ đang quá tải.',
        hint: 'network panel, wireless router, busy',
      },
      {
        text: 'Could you look at the small white box on the wall and check the lights?',
        translation:
          '[IT Support] Bạn có thể nhìn hộp trắng nhỏ trên tường và kiểm tra các đèn báo giúp tôi không?',
        hint: 'box on the wall, lights',
      },
      {
        text: 'The power light is green, but the network light is blinking orange very fast.',
        translation:
          '[Nhân viên] Đèn nguồn màu xanh lá, nhưng đèn mạng đang nhấp nháy màu cam rất nhanh.',
        hint: 'power light, blinking orange',
      },
      {
        text: 'I will restart that access point remotely now, so WiFi will drop for one minute.',
        translation:
          '[IT Support] Tôi sẽ khởi động lại điểm phát sóng đó từ xa ngay, nên WiFi sẽ ngắt khoảng một phút.',
        hint: 'access point, remotely, drop',
      },
      {
        text: 'The orange light turned solid green, and our pages are loading fast again now.',
        translation:
          '[Nhân viên] Đèn cam chuyển sang xanh đứng yên rồi, các trang web cũng tải nhanh lại ngay.',
        hint: 'solid green, loading fast',
      },
    ],
  },
  {
    id: 'lesson-audio-itops-a2-04',
    videoId: 'audio-itops-a2-04',
    title: 'A2-B1 | 04. Daily Backup Check & Free Disk Space (IT Ops)',
    description:
      "Simple operations chat about checking last night's backup status and cleaning up old temporary files (~1 min, A2-B1, UK English).",
    voiceAccent: 'en-GB',
    level: 'Beginner',
    items: [
      {
        text: 'Hey Anna, did the nightly backup finish safely on our main file server?',
        translation:
          '[Ops] Chào Anna, bản sao lưu hằng đêm trên máy chủ tệp chính có hoàn tất an toàn không?',
        hint: 'nightly backup, file server',
      },
      {
        text: 'Not completely; the backup stopped halfway because the storage drive ran out of space.',
        translation:
          '[Junior Ops] Chưa hoàn toàn; bản sao lưu dừng giữa chừng vì ổ đĩa lưu trữ bị hết dung lượng.',
        hint: 'stopped halfway, storage drive, ran out of space',
      },
      {
        text: 'Let us check which folder is taking up the most room on that drive.',
        translation:
          '[Ops] Hãy kiểm tra xem thư mục nào đang chiếm nhiều chỗ nhất trên ổ đĩa đó.',
        hint: 'folder, taking up, room',
      },
      {
        text: 'I see hundreds of old temporary files from last month still sitting inside the folder.',
        translation:
          '[Junior Ops] Mình thấy hàng trăm tệp tạm cũ từ tháng trước vẫn còn nằm trong thư mục.',
        hint: 'temporary files, sitting inside',
      },
      {
        text: 'Are any active users or programs still using those old files right now?',
        translation:
          '[Ops] Có người dùng hay chương trình nào đang hoạt động còn dùng các tệp cũ đó không?',
        hint: 'active users, programs',
      },
      {
        text: 'No, they are just finished export files that we only keep for seven days.',
        translation:
          '[Junior Ops] Không, đó chỉ là các tệp xuất dữ liệu đã xong mà ta chỉ giữ lại bảy ngày.',
        hint: 'export files, keep',
      },
      {
        text: 'Okay, delete the files older than two weeks and run the backup job again.',
        translation:
          '[Ops] Được rồi, hãy xóa các tệp cũ hơn hai tuần rồi chạy lại tác vụ sao lưu nhé.',
        hint: 'older than, backup job',
      },
      {
        text: 'We now have forty percent free space, and the new backup finished with zero errors.',
        translation:
          '[Junior Ops] Giờ ta đã có 40% dung lượng trống, và bản sao lưu mới vừa chạy xong không lỗi nào.',
        hint: 'free space, zero errors',
      },
    ],
  },
  {
    id: 'lesson-audio-itops-a2-05',
    videoId: 'audio-itops-a2-05',
    title: 'A2-B1 | 05. Website Down? Basic First Checks (IT Ops)',
    description:
      'Clear beginner IT Ops conversation walking through the first steps when a customer reports the company website is down (~1 min, A2-B1, UK English).',
    voiceAccent: 'en-GB',
    level: 'Beginner',
    items: [
      {
        text: 'Tom, a client just messaged us saying our company website will not open.',
        translation:
          '[Support] Tom ơi, một khách hàng vừa nhắn tin báo trang web công ty không mở được.',
        hint: 'messaged, website',
      },
      {
        text: 'Let me test the address from my browser and check our public status page first.',
        translation:
          '[Ops] Để mình thử mở địa chỉ từ trình duyệt và kiểm tra trang trạng thái công khai trước.',
        hint: 'browser, status page',
      },
      {
        text: 'I see an error page too, so the problem is definitely on our side.',
        translation:
          '[Ops] Mình cũng thấy trang báo lỗi, vậy chắc chắn sự cố nằm ở phía hệ thống của mình.',
        hint: 'error page, definitely, on our side',
      },
      {
        text: 'Should we tell the manager right away, or check the web service logs first?',
        translation:
          '[Support] Ta nên báo quản lý ngay lập tức, hay kiểm tra nhật ký dịch vụ web trước?',
        hint: 'right away, service logs',
      },
      {
        text: 'Always check the service status first so we can share useful facts in our update.',
        translation:
          '[Ops] Luôn kiểm tra trạng thái dịch vụ trước để ta chia sẻ thông tin hữu ích khi cập nhật.',
        hint: 'service status, useful facts',
      },
      {
        text: 'Look here, the web service stopped five minutes ago right after a small setting change.',
        translation:
          '[Ops] Nhìn đây này, dịch vụ web đã dừng năm phút trước ngay sau một thay đổi cài đặt nhỏ.',
        hint: 'setting change',
      },
      {
        text: 'I will undo that setting change and start the web service back up cleanly.',
        translation:
          '[Ops] Mình sẽ hoàn tác thay đổi cài đặt đó và khởi động lại dịch vụ web thật gọn.',
        hint: 'undo, start back up',
      },
      {
        text: 'The homepage is online again, and I will reply to the client with a quick apology.',
        translation:
          '[Support] Trang chủ lên mạng lại rồi, để mình nhắn trả lời xin lỗi nhanh cho khách hàng.',
        hint: 'homepage, online, apology',
      },
    ],
  },
  {
    id: 'lesson-audio-itops-a2-06',
    videoId: 'audio-itops-a2-06',
    title: 'A2-B1 | 06. Planning a Weekend Software Update (IT Ops)',
    description:
      'Clear A2-B1 workplace chat planning a Saturday night server update, notifying users, saving a backup, and running quick tests (~1 min, A2-B1, UK English).',
    voiceAccent: 'en-GB',
    level: 'Beginner',
    items: [
      {
        text: 'Hi Maya, when should we install the new security update on our office servers?',
        translation:
          '[SysAdmin] Chào Maya, khi nào ta nên cài bản cập nhật bảo mật mới trên các máy chủ văn phòng?',
        hint: 'install, security update',
      },
      {
        text: 'Saturday night at eleven is best because nobody is working in the office then.',
        translation:
          '[Ops Lead] Tối thứ Bảy lúc mười một giờ là tốt nhất vì lúc đó không ai làm việc ở văn phòng.',
        hint: 'nobody, working',
      },
      {
        text: 'How long will the systems be offline while the servers install and restart?',
        translation:
          '[SysAdmin] Các hệ thống sẽ tạm ngưng bao lâu trong lúc máy chủ cài đặt và khởi động lại?',
        hint: 'offline, restart',
      },
      {
        text: 'Usually around twenty minutes, though we should tell staff to expect thirty minutes.',
        translation:
          '[Ops Lead] Thường khoảng hai mươi phút, nhưng ta nên báo nhân viên dự phòng ba mươi phút.',
        hint: 'usually, expect',
      },
      {
        text: 'I will send a short reminder email to every department on Friday morning.',
        translation:
          '[SysAdmin] Tôi sẽ gửi một email nhắc nhở ngắn cho mọi phòng ban vào sáng thứ Sáu.',
        hint: 'reminder email, department',
      },
      {
        text: 'Please also make a fresh backup copy before you press the update button.',
        translation:
          '[Ops Lead] Nhớ tạo thêm một bản sao lưu mới trước khi bạn bấm nút cập nhật nhé.',
        hint: 'fresh backup copy, press',
      },
      {
        text: 'Of course, if anything breaks, we can restore the old version very quickly.',
        translation:
          '[SysAdmin] Chắc chắn rồi, nếu có gì hỏng ta có thể khôi phục phiên bản cũ rất nhanh.',
        hint: 'breaks, restore, old version',
      },
      {
        text: 'After the restart finishes, test login and email once, then post a green check in chat.',
        translation:
          '[Ops Lead] Sau khi khởi động lại xong, hãy thử đăng nhập và email một lần rồi nhắn báo xanh vào nhóm chat nhé.',
        hint: 'test login, post',
      },
    ],
  },
]

const RAW_IT_OPS_B1_SPECS: RawAudioLessonSpec[] = [
  {
    id: 'lesson-audio-itops-b1-01',
    videoId: 'audio-itops-b1-01',
    title: 'B1 | 01. Investigating High Memory Usage on Production (IT Ops)',
    description:
      'A 2-minute B1 IT Operations call tracking steady memory growth on a production server, moving traffic safely, and recovering after a release (~2 min, B1, UK English).',
    voiceAccent: 'en-GB',
    level: 'Intermediate',
    items: [
      {
        text: 'Hello, I am calling because memory usage on application server two just passed eighty five percent.',
        translation:
          '[Monitoring] Xin chào, tôi gọi vì mức dùng bộ nhớ trên máy chủ ứng dụng số hai vừa vượt qua 85%.',
        hint: 'memory usage, application server',
      },
      {
        text: 'Thanks for telling me early; did the jump happen suddenly, or has it been going up slowly?',
        translation:
          '[SysAdmin] Cảm ơn đã báo sớm; mức tăng đó xảy ra đột ngột hay đã tăng dần từ từ?',
        hint: 'suddenly, going up slowly',
      },
      {
        text: 'Looking at the chart, memory started rising steadily right after last night’s software update.',
        translation:
          '[Monitoring] Nhìn vào biểu đồ, bộ nhớ bắt đầu tăng đều ngay sau bản cập nhật phần mềm tối qua.',
        hint: 'chart, rising steadily, software update',
      },
      {
        text: 'Are the other application servers showing the same rise on the dashboard?',
        translation:
          '[SysAdmin] Các máy chủ ứng dụng khác có hiển thị mức tăng giống vậy trên bảng điều khiển không?',
        hint: 'same rise, dashboard',
      },
      {
        text: 'Yes, server one is already at seventy eight percent, and server three is close behind.',
        translation:
          '[Monitoring] Có, máy chủ số một đã ở mức 78%, còn máy chủ số ba cũng bám sát phía sau.',
        hint: 'close behind',
      },
      {
        text: 'That clearly shows the new version is not freeing memory after finishing background tasks.',
        translation:
          '[SysAdmin] Điều đó cho thấy rõ phiên bản mới không giải phóng bộ nhớ sau khi hoàn tất tác vụ nền.',
        hint: 'clearly shows, freeing memory, background tasks',
      },
      {
        text: 'Are customers seeing slow page loads or error messages on the website right now?',
        translation:
          '[SysAdmin] Khách hàng có đang gặp tình trạng tải trang chậm hay báo lỗi trên trang web lúc này không?',
        hint: 'page loads, error messages',
      },
      {
        text: 'Not yet, response times are still normal, though we might hit the limit within two hours.',
        translation:
          '[Monitoring] Chưa ạ, thời gian phản hồi vẫn bình thường, nhưng có thể chạm giới hạn trong vòng hai giờ nữa.',
        hint: 'response times, hit the limit',
      },
      {
        text: 'Let us act before users notice; first, remove server two from the active load balancer.',
        translation:
          '[SysAdmin] Hãy xử lý trước khi người dùng nhận ra; trước hết hãy gỡ máy chủ số hai khỏi bộ cân bằng tải đang chạy.',
        hint: 'act before, load balancer',
      },
      {
        text: 'Should I wait for current user sessions to finish before stopping the application service?',
        translation:
          '[Monitoring] Tôi có nên chờ các phiên người dùng hiện tại kết thúc trước khi dừng dịch vụ ứng dụng không?',
        hint: 'user sessions, application service',
      },
      {
        text: 'Yes, give it thirty seconds to finish current connections so nobody loses their shopping cart.',
        translation:
          '[SysAdmin] Đúng rồi, chờ ba mươi giây để hoàn tất các kết nối hiện tại để không ai bị mất giỏ hàng.',
        hint: 'current connections, shopping cart',
      },
      {
        text: 'Server two has no active users now; do you want a quick memory report before I restart it?',
        translation:
          '[Monitoring] Máy chủ số hai đã hết người dùng hoạt động; bạn có cần lấy báo cáo bộ nhớ nhanh trước khi tôi khởi động lại không?',
        hint: 'active users, memory report',
      },
      {
        text: 'Please save the process list and memory report into our shared support folder.',
        translation:
          '[SysAdmin] Nhớ lưu danh sách tiến trình và báo cáo bộ nhớ vào thư mục hỗ trợ dùng chung nhé.',
        hint: 'process list, support folder',
      },
      {
        text: 'Both files are saved cleanly, and I am restarting the service on server two right now.',
        translation:
          '[Monitoring] Cả hai tệp đã lưu gọn gàng, và tôi đang khởi động lại dịch vụ trên máy chủ số hai ngay đây.',
        hint: 'saved cleanly',
      },
      {
        text: 'Once health checks pass, add server two back, then we will return to the previous stable version.',
        translation:
          '[SysAdmin] Khi kiểm tra sức khỏe đạt, hãy đưa máy chủ số hai vào lại rồi ta sẽ quay về phiên bản ổn định trước đó.',
        hint: 'health checks, stable version',
      },
      {
        text: 'Server two is healthy at thirty percent memory, and I am updating server one next.',
        translation:
          '[Monitoring] Máy chủ số hai đã ổn định ở mức 30% bộ nhớ, tôi đang cập nhật tiếp máy chủ số một.',
        hint: 'healthy, updating',
      },
      {
        text: 'I will share the memory report with the development team so they can fix the problem today.',
        translation:
          '[SysAdmin] Tôi sẽ gửi báo cáo bộ nhớ cho đội phát triển để họ sửa lỗi trong hôm nay.',
        hint: 'development team, fix the problem',
      },
      {
        text: 'All three servers are stable again, and I will keep watching the memory chart for the next hour.',
        translation:
          '[Monitoring] Cả ba máy chủ đã ổn định trở lại, tôi sẽ tiếp tục theo dõi biểu đồ bộ nhớ trong một giờ tới.',
        hint: 'keep watching, next hour',
      },
    ],
  },
  {
    id: 'lesson-audio-itops-b1-02',
    videoId: 'audio-itops-b1-02',
    title: 'B1 | 02. Fixing a Broken VPN Tunnel for Branch Office (IT Ops)',
    description:
      'A 2-minute B1 networking conversation fixing a disconnected site-to-site VPN tunnel, expired shared key, and network checks (~2 min, B1, UK English).',
    voiceAccent: 'en-GB',
    level: 'Intermediate',
    items: [
      {
        text: 'Hello, staff at our Manchester office cannot open the internal finance system this morning.',
        translation:
          '[Branch Support] Xin chào, nhân viên tại văn phòng Manchester sáng nay không mở được hệ thống tài chính nội bộ.',
        hint: 'office, internal finance system',
      },
      {
        text: 'Can they still open normal public websites, or is the whole office internet connection down?',
        translation:
          '[Network Eng] Họ vẫn mở được các trang web công khai bình thường, hay cả đường truyền internet văn phòng bị mất?',
        hint: 'public websites, connection down',
      },
      {
        text: 'Public websites work fine, and office email loads quickly, so only internal tools are failing.',
        translation:
          '[Branch Support] Các trang web công khai chạy tốt và email văn phòng tải nhanh, nên chỉ các công cụ nội bộ bị lỗi.',
        hint: 'internal tools, failing',
      },
      {
        text: 'That sounds like a problem with the secure VPN tunnel between Manchester and our main data centre.',
        translation:
          '[Network Eng] Nghe giống sự cố ở đường hầm VPN bảo mật giữa Manchester và trung tâm dữ liệu chính của ta.',
        hint: 'VPN tunnel, data centre',
      },
      {
        text: 'Let me log into the main network gateway and check the tunnel status right away.',
        translation:
          '[Network Eng] Để tôi đăng nhập vào cổng mạng chính và kiểm tra trạng thái đường hầm ngay lập tức.',
        hint: 'network gateway, tunnel status',
      },
      {
        text: 'Yes, the tunnel went offline at six thirty this morning and keeps failing to reconnect.',
        translation:
          '[Network Eng] Đúng rồi, đường hầm đã ngắt kết nối lúc sáu giờ ba mươi sáng nay và cứ kết nối lại thất bại.',
        hint: 'went offline, reconnect',
      },
      {
        text: 'Did someone change the office firewall rules last night, or did the internet provider have an issue?',
        translation:
          '[Branch Support] Có ai đổi quy tắc tường lửa văn phòng tối qua không, hay nhà mạng gặp sự cố?',
        hint: 'firewall rules, internet provider',
      },
      {
        text: 'The gateway logs show a login error because the shared security key expired today.',
        translation:
          '[Network Eng] Nhật ký cổng mạng báo lỗi đăng nhập vì khóa bảo mật dùng chung vừa hết hạn hôm nay.',
        hint: 'shared security key, expired',
      },
      {
        text: 'I did not know those tunnel keys had a fixed yearly expiry date.',
        translation:
          '[Branch Support] Tôi không biết các khóa đường hầm đó có ngày hết hạn cố định hằng năm.',
        hint: 'yearly, expiry date',
      },
      {
        text: 'We change them every twelve months for security, and the reminder ticket was missed last week.',
        translation:
          '[Network Eng] Chúng tôi đổi chúng mỗi mười hai tháng để bảo mật, và phiếu nhắc nhở tuần trước bị bỏ sót.',
        hint: 'reminder ticket, missed',
      },
      {
        text: 'Can you update the key from the main office, or do I need to plug into the local router?',
        translation:
          '[Branch Support] Bạn có thể cập nhật khóa từ văn phòng chính không, hay tôi cần cắm máy vào bộ định tuyến tại chỗ?',
        hint: 'main office, local router',
      },
      {
        text: 'I can reach the branch router over our backup management line, so no cables are needed.',
        translation:
          '[Network Eng] Tôi truy cập được bộ định tuyến chi nhánh qua đường quản trị dự phòng nên không cần cắm dây đâu.',
        hint: 'backup management line, cables',
      },
      {
        text: 'I just created a fresh key and saved the matching settings on both gateway devices.',
        translation:
          '[Network Eng] Tôi vừa tạo một khóa mới và lưu cấu hình khớp nhau trên cả hai thiết bị cổng mạng.',
        hint: 'fresh key, matching settings',
      },
      {
        text: 'Now I am restarting the tunnel link; give it twenty seconds to build the secure connection.',
        translation:
          '[Network Eng] Giờ tôi đang khởi động lại liên kết đường hầm; chờ khoảng hai mươi giây để thiết lập kết nối bảo mật.',
        hint: 'restarting, secure connection',
      },
      {
        text: 'The status light just turned green on my screen, and test pings are returning in twelve milliseconds.',
        translation:
          '[Network Eng] Đèn trạng thái vừa chuyển xanh trên màn hình của tôi, và lệnh ping thử phản hồi trong mười hai mili giây.',
        hint: 'test pings, milliseconds',
      },
      {
        text: 'Let me ask the finance team to refresh their browsers and sign in again right now.',
        translation:
          '[Branch Support] Để tôi nhờ nhóm tài chính tải lại trình duyệt và đăng nhập lại ngay lúc này.',
        hint: 'refresh, sign in',
      },
      {
        text: 'They said the invoices are loading smoothly, and the shared network drive is visible again.',
        translation:
          '[Branch Support] Họ báo hóa đơn tải mượt rồi, ổ đĩa mạng dùng chung cũng hiện lại bình thường.',
        hint: 'loading smoothly, shared network drive',
      },
      {
        text: 'Great; I will set an automatic calendar reminder thirty days before next year’s key update.',
        translation:
          '[Network Eng] Tuyệt; tôi sẽ đặt nhắc lịch tự động trước ba mươi ngày cho kỳ cập nhật khóa năm tới.',
        hint: 'calendar reminder, key update',
      },
    ],
  },
  {
    id: 'lesson-audio-itops-b1-03',
    videoId: 'audio-itops-b1-03',
    title: 'B1 | 03. Handling a Sudden Traffic Spike During Sales (IT Ops)',
    description:
      'A 2-minute B1 cloud operations call handling a flash-sale traffic jump with extra web servers, page caching, and checkout checks (~2 min, B1, UK English).',
    voiceAccent: 'en-GB',
    level: 'Intermediate',
    items: [
      {
        text: 'Hey, our marketing team just sent out a flash sale email and website traffic doubled.',
        translation:
          '[Ops Lead] Chào bạn, đội marketing vừa gửi email khuyến mãi chớp nhoáng và lưu lượng web tăng gấp đôi rồi.',
        hint: 'flash sale, traffic doubled',
      },
      {
        text: 'I saw the live chart jump a minute ago; how are the web servers handling the load?',
        translation:
          '[Cloud Eng] Tôi thấy biểu đồ trực tiếp nhảy vọt một phút trước; các máy chủ web đang chịu tải thế nào?',
        hint: 'live chart, handling the load',
      },
      {
        text: 'Average CPU across the web servers is around seventy five percent, and pages feel slower.',
        translation:
          '[Ops Lead] CPU trung bình trên các máy chủ web khoảng 75%, và các trang web bắt đầu chậm hơn.',
        hint: 'average CPU, slower',
      },
      {
        text: 'Did automatic scaling start adding extra server instances when CPU crossed seventy percent?',
        translation:
          '[Cloud Eng] Hệ thống tự động mở rộng đã bắt đầu thêm máy chủ khi CPU vượt 70% chưa?',
        hint: 'automatic scaling, extra server',
      },
      {
        text: 'It added two servers, but the maximum limit was set to six servers in our scaling rule.',
        translation:
          '[Ops Lead] Nó đã thêm hai máy chủ, nhưng giới hạn tối đa trong quy tắc mở rộng chỉ đặt là sáu máy.',
        hint: 'maximum limit, scaling rule',
      },
      {
        text: 'Let us raise that limit to ten servers right now so the system has plenty of extra space.',
        translation:
          '[Cloud Eng] Hãy nâng giới hạn lên mười máy chủ ngay để hệ thống có nhiều khoảng trống dự phòng.',
        hint: 'raise that limit, extra space',
      },
      {
        text: 'How long does each new web server take to start up and pass its health check?',
        translation:
          '[Ops Lead] Mỗi máy chủ web mới mất bao lâu để khởi động và vượt qua bài kiểm tra sức khỏe?',
        hint: 'start up, health check',
      },
      {
        text: 'About ninety seconds; two more servers are already starting and should join the balancer soon.',
        translation:
          '[Cloud Eng] Khoảng chín mươi giây; hai máy chủ nữa đã bắt đầu chạy và sẽ sớm tham gia bộ cân bằng tải.',
        hint: 'ninety seconds, join the balancer',
      },
      {
        text: 'What about the main database? Are heavy product searches putting too much pressure on it?',
        translation:
          '[Ops Lead] Còn cơ sở dữ liệu chính thì sao? Lượt tìm kiếm sản phẩm nhiều có gây áp lực lớn lên nó không?',
        hint: 'product searches, pressure',
      },
      {
        text: 'Database reads went up fast, so turning on longer page caching for product lists will help right away.',
        translation:
          '[Cloud Eng] Lượt đọc database tăng nhanh, nên bật lưu đệm trang lâu hơn cho danh sách sản phẩm sẽ giúp ngay lập tức.',
        hint: 'went up fast, page caching',
      },
      {
        text: 'Make sure we do not cache personal cart pages or payment checkout screens by mistake.',
        translation:
          '[Ops Lead] Nhớ đảm bảo ta không vô tình lưu đệm trang giỏ hàng cá nhân hay màn hình thanh toán nhé.',
        hint: 'by mistake, checkout screens',
      },
      {
        text: 'Of course, caching only applies to public product pages, images, and static banner files.',
        translation:
          '[Cloud Eng] Chắc chắn rồi, bộ nhớ đệm chỉ áp dụng cho trang sản phẩm công khai, hình ảnh và tệp banner tĩnh.',
        hint: 'product pages, static files',
      },
      {
        text: 'The new cache rule is live, and database read traffic just dropped by nearly forty percent.',
        translation:
          '[Cloud Eng] Quy tắc bộ nhớ đệm mới đã chạy, lưu lượng đọc cơ sở dữ liệu vừa giảm gần 40%.',
        hint: 'cache rule, dropped by nearly',
      },
      {
        text: 'Awesome, and all eight web servers are now green with average CPU back under fifty percent.',
        translation:
          '[Ops Lead] Tuyệt vời, cả tám máy chủ web đều đã xanh với mức CPU trung bình quay về dưới 50%.',
        hint: 'average CPU, under fifty percent',
      },
      {
        text: 'I also ran a quick test order on the checkout page and it finished in under one second.',
        translation:
          '[Cloud Eng] Tôi cũng vừa chạy một đơn hàng thử trên trang thanh toán và hoàn tất trong chưa đầy một giây.',
        hint: 'test order, finished',
      },
      {
        text: 'Let us ask marketing to tell operations one day ahead before future flash sales.',
        translation:
          '[Ops Lead] Hãy nhờ đội marketing báo trước cho bộ phận vận hành một ngày trước các đợt khuyến mãi sau.',
        hint: 'one day ahead, future',
      },
      {
        text: 'Good idea; that way we can prepare the servers and check our limits early.',
        translation:
          '[Cloud Eng] Ý hay đấy; như vậy ta có thể chuẩn bị máy chủ trước và kiểm tra giới hạn từ sớm.',
        hint: 'prepare the servers, check our limits',
      },
      {
        text: 'I will stay on the live dashboard until the sale ends and reduce the servers tonight.',
        translation:
          '[Cloud Eng] Tôi sẽ theo dõi bảng điều khiển trực tiếp đến khi hết khuyến mãi rồi giảm bớt máy chủ tối nay.',
        hint: 'live dashboard, reduce',
      },
    ],
  },
  {
    id: 'lesson-audio-itops-b1-04',
    videoId: 'audio-itops-b1-04',
    title: 'B1 | 04. Resolving Email Delivery Delays & Queue Backlog (IT Ops)',
    description:
      'A 2-minute B1 mail operations call fixing delayed customer emails, checking a stuck mail queue, stopping a noisy loop, and clearing deliveries (~2 min, B1, UK English).',
    voiceAccent: 'en-GB',
    level: 'Intermediate',
    items: [
      {
        text: 'Hi, several customers called support because their order confirmation emails still have not arrived.',
        translation:
          '[Helpdesk] Chào bạn, vài khách hàng gọi hỗ trợ vì email xác nhận đơn hàng vẫn chưa tới nơi.',
        hint: 'order confirmation, arrived',
      },
      {
        text: 'Are those emails bouncing back with errors, or are they simply arriving much later than usual?',
        translation:
          '[Mail Admin] Những email đó bị trả ngược báo lỗi hay chỉ đến chậm hơn bình thường nhiều?',
        hint: 'bouncing back, later than usual',
      },
      {
        text: 'They are arriving about forty minutes late, and staff noticed internal messages are delayed too.',
        translation:
          '[Helpdesk] Chúng đến trễ khoảng bốn mươi phút, và nhân viên cũng thấy thông báo nội bộ bị chậm theo.',
        hint: 'delayed, internal messages',
      },
      {
        text: 'Let me check our outgoing mail server; wow, there are twelve thousand messages stuck in the queue.',
        translation:
          '[Mail Admin] Để tôi kiểm tra máy chủ gửi thư; ôi, có mười hai nghìn thư đang bị kẹt trong hàng đợi.',
        hint: 'outgoing mail server, stuck in the queue',
      },
      {
        text: 'Twelve thousand? Normally our busy morning queue only holds around two hundred emails.',
        translation:
          '[Helpdesk] Mười hai nghìn cơ à? Bình thường hàng đợi giờ cao điểm buổi sáng chỉ khoảng hai trăm email thôi.',
        hint: 'normally, holds around',
      },
      {
        text: 'Wait a second, most of these messages are coming from one single automatic reporting account.',
        translation:
          '[Mail Admin] Khoan đã, phần lớn các thư này đều xuất phát từ duy nhất một tài khoản báo cáo tự động.',
        hint: 'automatic reporting account',
      },
      {
        text: 'What is that account sending? It looks like the same five megabyte attachment repeated every second.',
        translation:
          '[Mail Admin] Tài khoản đó đang gửi gì vậy? Trông như cùng một tệp đính kèm năm megabyte lặp lại mỗi giây.',
        hint: 'attachment, repeated',
      },
      {
        text: 'Oh no, a scheduled billing script must be stuck in a retry loop after failing once.',
        translation:
          '[Helpdesk] Ôi không, chắc một kịch bản xuất hóa đơn định kỳ bị kẹt vòng lặp gửi lại sau khi lỗi một lần.',
        hint: 'scheduled script, retry loop',
      },
      {
        text: 'Exactly; it filled up all outgoing mail workers, blocking real customer emails behind it.',
        translation:
          '[Mail Admin] Chính xác; nó chiếm kín toàn bộ luồng gửi thư, chặn hết email của khách hàng ở phía sau.',
        hint: 'mail workers, blocking',
      },
      {
        text: 'First, I am pausing that automatic sender account so no new copy messages enter the queue.',
        translation:
          '[Mail Admin] Trước hết tôi tạm khóa tài khoản gửi tự động đó để không có thêm thư trùng lặp vào hàng đợi.',
        hint: 'pausing, copy messages',
      },
      {
        text: 'Can we clear out only those repeated report messages without deleting real customer emails?',
        translation:
          '[Helpdesk] Mình có thể dọn riêng các thư báo cáo lặp lại đó mà không xóa nhầm email khách hàng thật không?',
        hint: 'clear out, without deleting',
      },
      {
        text: 'Yes, I can filter the queue by sender address and remove only the stuck reporting job.',
        translation:
          '[Mail Admin] Được chứ, tôi có thể lọc hàng đợi theo địa chỉ người gửi và chỉ gỡ tác vụ báo cáo bị kẹt.',
        hint: 'filter the queue, sender address',
      },
      {
        text: 'Done, eleven thousand repeated messages are cleared, leaving only three hundred real customer emails.',
        translation:
          '[Mail Admin] Xong rồi, mười một nghìn thư lặp đã được dọn, chỉ còn ba trăm email khách hàng thật.',
        hint: 'real customer emails',
      },
      {
        text: 'Now I am pushing the mail queue so the server sends those waiting confirmations right away.',
        translation:
          '[Mail Admin] Giờ tôi đẩy hàng đợi thư để máy chủ gửi ngay những thư xác nhận đang chờ.',
        hint: 'pushing the mail queue, right away',
      },
      {
        text: 'I just tested a password reset email and it arrived in my inbox within three seconds.',
        translation:
          '[Helpdesk] Tôi vừa thử một email đặt lại mật khẩu và nó vào hộp thư đến trong vòng ba giây.',
        hint: 'arrived in my inbox',
      },
      {
        text: 'Great news; I will also tell the billing team to add a clear retry limit on their script.',
        translation:
          '[Mail Admin] Tin tốt quá; tôi cũng sẽ báo nhóm thanh toán thêm giới hạn thử lại rõ ràng vào kịch bản của họ.',
        hint: 'clear retry limit',
      },
      {
        text: 'Should we set a queue size alert so operations gets a message if more than five hundred emails wait?',
        translation:
          '[Helpdesk] Ta có nên đặt cảnh báo kích thước hàng đợi để vận hành nhận tin khi có hơn năm trăm thư chờ không?',
        hint: 'queue size alert',
      },
      {
        text: 'Yes, I am adding that monitoring rule right now along with a per minute sending limit.',
        translation:
          '[Mail Admin] Có chứ, tôi đang thêm quy tắc giám sát đó ngay cùng với giới hạn số thư gửi mỗi phút.',
        hint: 'monitoring rule, sending limit',
      },
    ],
  },
  {
    id: 'lesson-audio-itops-b1-05',
    videoId: 'audio-itops-b1-05',
    title: 'B1 | 05. Cleaning Up Inodes & Stuck Background Jobs (IT Ops)',
    description:
      'A 2-minute B1 Linux operations conversation solving a "no space left" error caused by 100% inode usage from tiny session files (~2 min, B1, UK English).',
    voiceAccent: 'en-GB',
    level: 'Intermediate',
    items: [
      {
        text: 'Hi, I am confused because the web server says no space left, even though disk space looks fine.',
        translation:
          '[Junior Ops] Chào bạn, mình hơi rối vì máy chủ web báo hết dung lượng dù dung lượng ổ đĩa trông vẫn ổn.',
        hint: 'confused, no space left',
      },
      {
        text: 'How much free space did the normal disk command show when you checked it?',
        translation:
          '[Linux Eng] Lệnh kiểm tra đĩa thông thường báo còn bao nhiêu dung lượng trống khi bạn xem?',
        hint: 'disk command, free space',
      },
      {
        text: 'It showed thirty five percent free, about forty gigabytes available, yet nothing can create a new file.',
        translation:
          '[Junior Ops] Nó hiện còn 35% trống, khoảng bốn mươi gigabyte sẵn dùng, vậy mà không gì tạo được tệp mới.',
        hint: 'available, create a new file',
      },
      {
        text: 'Aha, that is a common Linux problem; please check the inode usage table right now.',
        translation:
          '[Linux Eng] À ha, đó là một sự cố Linux rất hay gặp; bạn kiểm tra ngay bảng mức dùng inode đi.',
        hint: 'common problem, inode usage',
      },
      {
        text: 'Oh wow, inode usage on the root drive is at one hundred percent.',
        translation:
          '[Junior Ops] Ồ chà, mức sử dụng inode trên ổ đĩa gốc đang chạm đúng 100%.',
        hint: 'root drive, one hundred percent',
      },
      {
        text: 'Could you quickly explain why a drive runs out of inodes while gigabytes are still free?',
        translation:
          '[Junior Ops] Bạn giải thích nhanh giúp vì sao ổ đĩa hết inode trong khi vẫn còn thừa hàng chục gigabyte được không?',
        hint: 'quickly explain, runs out of',
      },
      {
        text: 'Every single file needs one inode record, so millions of tiny files can use up every slot.',
        translation:
          '[Linux Eng] Mỗi tệp đều cần một bản ghi inode, nên hàng triệu tệp nhỏ xíu có thể chiếm sạch mọi vị trí.',
        hint: 'inode record, tiny files, use up',
      },
      {
        text: 'Let us find which folder holds the highest number of small files on this machine.',
        translation:
          '[Linux Eng] Hãy tìm xem thư mục nào đang chứa số lượng tệp nhỏ nhiều nhất trên máy này.',
        hint: 'folder, highest number',
      },
      {
        text: 'Found it; the temporary session folder has over two million tiny files created over three months.',
        translation:
          '[Junior Ops] Tìm thấy rồi; thư mục phiên tạm có hơn hai triệu tệp nhỏ được tạo suốt ba tháng qua.',
        hint: 'session folder, two million',
      },
      {
        text: 'Why did our nightly cleanup job stop clearing old session files three months ago?',
        translation:
          '[Linux Eng] Tại sao tác vụ dọn dẹp hằng đêm lại ngừng xóa các tệp phiên cũ từ ba tháng trước?',
        hint: 'nightly cleanup job',
      },
      {
        text: 'Let me check the scheduled task file; someone turned off the cleanup line during testing and forgot.',
        translation:
          '[Junior Ops] Để mình kiểm tra tệp tác vụ định kỳ; có ai đó đã tắt dòng dọn dẹp lúc thử nghiệm rồi quên bật lại.',
        hint: 'scheduled task, turned off, forgot',
      },
      {
        text: 'Good catch; remember not to run a simple delete all command on two million files at once.',
        translation:
          '[Linux Eng] Phát hiện tốt đấy; nhớ đừng chạy lệnh xóa tất cả thông thường trên hai triệu tệp cùng lúc nhé.',
        hint: 'good catch, at once',
      },
      {
        text: 'Right, because the shell command will fail with a too many files error.',
        translation:
          '[Junior Ops] Đúng rồi, vì lệnh shell sẽ báo lỗi quá nhiều tệp.',
        hint: 'shell command, too many files',
      },
      {
        text: 'Use the find command to delete in small groups for files older than two days so active sessions stay safe.',
        translation:
          '[Linux Eng] Hãy dùng lệnh find để xóa theo từng nhóm nhỏ cho tệp cũ hơn hai ngày để các phiên đang chạy vẫn an toàn.',
        hint: 'small groups, older than, stay safe',
      },
      {
        text: 'It is running smoothly now, and inode usage already dropped from one hundred down to twenty percent.',
        translation:
          '[Junior Ops] Lệnh đang chạy mượt rồi, mức dùng inode vừa giảm từ 100% xuống còn 20%.',
        hint: 'running smoothly, dropped',
      },
      {
        text: 'Next, turn the nightly cleanup schedule back on and check that the web app writes logs cleanly.',
        translation:
          '[Linux Eng] Tiếp theo hãy bật lại lịch dọn dẹp hằng đêm và kiểm tra xem ứng dụng web ghi log ổn chưa.',
        hint: 'turn back on, writes logs',
      },
      {
        text: 'Application logs are writing again, and I added an inode alert at eighty percent to our monitoring tool.',
        translation:
          '[Junior Ops] Log ứng dụng đã ghi trở lại, và mình đã thêm cảnh báo inode ở mức 80% vào công cụ giám sát.',
        hint: 'inode alert, monitoring tool',
      },
      {
        text: 'Nice work today; checking inodes is a very useful habit every Linux engineer should know.',
        translation:
          '[Linux Eng] Hôm nay làm tốt lắm; kiểm tra inode là thói quen rất hữu ích mà kỹ sư Linux nào cũng nên biết.',
        hint: 'useful habit',
      },
    ],
  },
  {
    id: 'lesson-audio-itops-b1-06',
    videoId: 'audio-itops-b1-06',
    title: 'B1 | 06. Planning a Safe Database Migration Weekend (IT Ops)',
    description:
      'A 2-minute B1 planning conversation preparing a customer database move to a larger server with test runs, checks, and a backup plan (~2 min, B1, UK English).',
    voiceAccent: 'en-GB',
    level: 'Intermediate',
    items: [
      {
        text: 'Good afternoon, let us finish our checklist for Saturday’s customer database migration.',
        translation:
          '[Project Lead] Chào buổi chiều, cùng chốt danh sách kiểm tra cho đợt chuyển cơ sở dữ liệu khách hàng thứ Bảy này nhé.',
        hint: 'checklist, database migration',
      },
      {
        text: 'Sure, our current server is almost full, so moving to the new machine is very important.',
        translation:
          '[DBA] Chắc chắn rồi, máy chủ hiện tại gần đầy rồi nên chuyển sang máy mới là rất quan trọng.',
        hint: 'almost full, very important',
      },
      {
        text: 'How much total downtime should we tell customers to expect on Saturday night?',
        translation:
          '[Project Lead] Chúng ta nên báo khách hàng dự kiến tổng thời gian tạm ngưng là bao lâu vào tối thứ Bảy?',
        hint: 'downtime, expect',
      },
      {
        text: 'In our test run on staging yesterday, the final switch took twenty five minutes from start to finish.',
        translation:
          '[DBA] Trong lần chạy thử trên staging hôm qua, bước chuyển cuối cùng mất hai mươi lăm phút từ đầu đến cuối.',
        hint: 'test run, final switch',
      },
      {
        text: 'Let us share a one hour maintenance window so we have plenty of extra time.',
        translation:
          '[Project Lead] Hãy thông báo khung bảo trì một tiếng để ta có nhiều thời gian dự phòng.',
        hint: 'maintenance window, extra time',
      },
      {
        text: 'How are we copying such a large database without keeping the website offline for hours?',
        translation:
          '[Project Lead] Ta sao chép cơ sở dữ liệu lớn như vậy bằng cách nào mà không để trang web ngừng hoạt động hàng giờ?',
        hint: 'copying, offline for hours',
      },
      {
        text: 'We already set up live syncing, so the new server gets every change in real time.',
        translation:
          '[DBA] Tụi mình đã thiết lập đồng bộ trực tiếp rồi, nên máy chủ mới nhận mọi thay đổi theo thời gian thực.',
        hint: 'live syncing, real time',
      },
      {
        text: 'That means during maintenance we only pause writes briefly and wait for the last few rows to catch up.',
        translation:
          '[DBA] Nghĩa là lúc bảo trì ta chỉ tạm dừng ghi dữ liệu một lát rồi chờ vài dòng cuối đồng bộ kịp.',
        hint: 'pause writes, catch up',
      },
      {
        text: 'Once the data matches completely, how will we check that nothing was missed during the move?',
        translation:
          '[Project Lead] Khi dữ liệu khớp hoàn toàn, ta sẽ kiểm tra thế nào để chắc không sót gì trong quá trình chuyển?',
        hint: 'matches completely, missed',
      },
      {
        text: 'I wrote a check script that compares table row counts and data checks across all main tables.',
        translation:
          '[DBA] Tôi đã viết một kịch bản kiểm tra so sánh số dòng và kiểm tra dữ liệu trên mọi bảng chính.',
        hint: 'check script, row counts',
      },
      {
        text: 'And what happens if our application servers show unexpected errors right after using the new database?',
        translation:
          '[Project Lead] Còn chuyện gì xảy ra nếu các máy chủ ứng dụng báo lỗi bất ngờ ngay sau khi dùng database mới?',
        hint: 'unexpected errors',
      },
      {
        text: 'We will keep the old database server safe and online in read only mode all weekend.',
        translation:
          '[DBA] Ta sẽ giữ nguyên máy chủ database cũ an toàn và chạy ở chế độ chỉ đọc suốt cuối tuần.',
        hint: 'read only mode',
      },
      {
        text: 'If any important quick test fails within fifteen minutes, we simply point traffic back to the old server.',
        translation:
          '[DBA] Nếu bất kỳ bài kiểm thử nhanh quan trọng nào lỗi trong mười lăm phút, ta chỉ việc trỏ lưu lượng về lại máy cũ.',
        hint: 'quick test, point traffic back',
      },
      {
        text: 'Have we checked firewall rules and login passwords so every app server can reach the new host?',
        translation:
          '[Project Lead] Ta đã kiểm tra quy tắc tường lửa và mật khẩu đăng nhập để mọi máy chủ ứng dụng nối được tới máy mới chưa?',
        hint: 'login passwords, reach the new host',
      },
      {
        text: 'Yes, we tested network access and login permissions from every production server earlier today.',
        translation:
          '[DBA] Rồi ạ, đầu ngày hôm nay ta đã thử kết nối mạng và quyền đăng nhập từ từng máy chủ production.',
        hint: 'network access, login permissions',
      },
      {
        text: 'Also remember to take a fresh full backup right before pausing production writes.',
        translation:
          '[Project Lead] Cũng nhớ tạo một bản sao lưu đầy đủ mới ngay trước khi tạm dừng ghi trên production nhé.',
        hint: 'fresh full backup',
      },
      {
        text: 'It is step two on our guide, and two engineers will double check every command together.',
        translation:
          '[DBA] Đó là bước hai trong hướng dẫn rồi, và hai kỹ sư sẽ cùng kiểm tra chéo từng câu lệnh.',
        hint: 'guide, double check',
      },
      {
        text: 'Everything looks well prepared; let us meet on the team call at ten forty five Saturday night.',
        translation:
          '[Project Lead] Mọi thứ chuẩn bị rất chu đáo rồi; hẹn gặp nhau trên cuộc gọi nhóm lúc mười giờ bốn lăm tối thứ Bảy nhé.',
        hint: 'well prepared, team call',
      },
    ],
  },
  {
    id: 'lesson-audio-itops-b1-07',
    videoId: 'audio-itops-b1-07',
    title: 'B1 | 07. Responding to a Phishing Email & Account Check (IT Ops)',
    description:
      'A 2-minute B1 security operations phone call helping an employee who clicked a fake invoice link, signing out sessions, blocking the site, and turning on two-factor login (~2 min, B1, UK English).',
    voiceAccent: 'en-GB',
    level: 'Intermediate',
    items: [
      {
        text: 'Hello security desk, I think I just made a mistake and clicked a strange invoice link in my email.',
        translation:
          '[Staff] Xin chào bộ phận bảo mật, tôi nghĩ mình vừa lỡ tay bấm vào một đường dẫn hóa đơn lạ trong email.',
        hint: 'made a mistake, strange invoice link',
      },
      {
        text: 'Thank you for calling right away; reporting it fast is the best thing you could do.',
        translation:
          '[Security Ops] Cảm ơn bạn đã gọi ngay lập tức; báo sớm là điều tốt nhất bạn có thể làm lúc này.',
        hint: 'reporting it fast',
      },
      {
        text: 'Tell me calmly what happened after you clicked the link; did a login page ask for your password?',
        translation:
          '[Security Ops] Hãy kể bình tĩnh chuyện gì xảy ra sau khi bạn bấm link; có trang đăng nhập nào đòi mật khẩu không?',
        hint: 'calmly, login page',
      },
      {
        text: 'Yes, it looked just like our company portal, so I typed my work email and password before seeing the strange address.',
        translation:
          '[Staff] Có, nó giống hệt cổng nội bộ công ty nên tôi đã nhập email và mật khẩu trước khi thấy địa chỉ lạ.',
        hint: 'company portal, strange address',
      },
      {
        text: 'Okay, do not worry; let me check your account login history and active sessions right now.',
        translation:
          '[Security Ops] Được rồi, đừng lo; để tôi kiểm tra lịch sử đăng nhập và các phiên đang mở của bạn ngay đây.',
        hint: 'login history, active sessions',
      },
      {
        text: 'I see a login attempt from an unknown city two minutes ago, so we need to lock it down fast.',
        translation:
          '[Security Ops] Tôi thấy một lượt đăng nhập từ một thành phố lạ hai phút trước, nên ta cần khóa chặt ngay.',
        hint: 'unknown city, lock it down',
      },
      {
        text: 'First, I am signing out all active sessions on every device and resetting your password right now.',
        translation:
          '[Security Ops] Trước tiên, tôi đăng xuất toàn bộ phiên đang hoạt động trên mọi thiết bị và đặt lại mật khẩu ngay.',
        hint: 'signing out, active sessions',
      },
      {
        text: 'Did the attacker open any shared files or forward emails from my mailbox?',
        translation:
          '[Staff] Kẻ tấn công có kịp mở tệp dùng chung nào hay chuyển tiếp email từ hộp thư của tôi không?',
        hint: 'attacker, forward emails, mailbox',
      },
      {
        text: 'Good news, the activity log shows zero file downloads and no hidden forwarding rules were added.',
        translation:
          '[Security Ops] Tin tốt là nhật ký hoạt động không ghi nhận lượt tải tệp nào và cũng chưa có quy tắc chuyển tiếp ẩn.',
        hint: 'activity log, forwarding rules',
      },
      {
        text: 'I am so glad; did the website download any strange file onto my laptop?',
        translation:
          '[Staff] Thật nhẹ nhõm quá; trang web đó có tải tệp lạ nào xuống máy tính xách tay của tôi không?',
        hint: 'glad, strange file',
      },
      {
        text: 'Our antivirus scan shows your laptop is clean, though I will run one more quick check.',
        translation:
          '[Security Ops] Công cụ diệt virus báo máy bạn sạch, nhưng tôi vẫn sẽ chạy thêm một lượt quét nhanh.',
        hint: 'antivirus scan, quick check',
      },
      {
        text: 'Please forward the fake email to our security inbox so we can block that website for the whole company.',
        translation:
          '[Security Ops] Bạn hãy chuyển tiếp thư giả đó tới hộp thư bảo mật để ta chặn trang web đó trên toàn công ty.',
        hint: 'fake email, whole company',
      },
      {
        text: 'I am forwarding it now; do I also need to change my password on any other work apps?',
        translation:
          '[Staff] Tôi đang chuyển tiếp đây; tôi có cần đổi mật khẩu trên ứng dụng công việc nào khác không?',
        hint: 'change my password',
      },
      {
        text: 'Only if you used the same password anywhere else; always keep your work password different from other accounts.',
        translation:
          '[Security Ops] Chỉ khi bạn dùng lại đúng mật khẩu đó ở nơi khác; hãy luôn giữ mật khẩu công việc khác với các tài khoản khác.',
        hint: 'same password, different',
      },
      {
        text: 'Next, let us turn on two factor login on your phone so a stolen password alone cannot sign in.',
        translation:
          '[Security Ops] Tiếp theo hãy bật đăng nhập hai bước trên điện thoại để riêng mật khẩu bị lộ không thể đăng nhập.',
        hint: 'two factor login, stolen password',
      },
      {
        text: 'I just scanned the setup code in my phone app and typed in the six digit code.',
        translation:
          '[Staff] Tôi vừa quét mã cài đặt trong ứng dụng điện thoại và nhập mã sáu chữ số rồi.',
        hint: 'setup code, six digit code',
      },
      {
        text: 'Your account is safe again, and I have already blocked the sender and removed the email from other inboxes.',
        translation:
          '[Security Ops] Tài khoản của bạn đã an toàn trở lại, và tôi đã chặn người gửi cũng như gỡ thư đó khỏi hộp thư người khác.',
        hint: 'blocked the sender, removed',
      },
      {
        text: 'Thanks so much for your help; I will always check the sender address carefully from now on.',
        translation:
          '[Staff] Cảm ơn bạn rất nhiều vì đã hỗ trợ; từ giờ tôi sẽ luôn kiểm tra kỹ địa chỉ người gửi.',
        hint: 'sender address, carefully',
      },
    ],
  },
  {
    id: 'lesson-audio-itops-b1-08',
    videoId: 'audio-itops-b1-08',
    title: 'B1 | 08. Fixing Broken Scheduled Backups & Storage Alerts (IT Ops)',
    description:
      'A 2-minute B1 operations call fixing three failed overnight backup jobs, expired cloud storage keys, manual upload, and restore tests (~2 min, B1, UK English).',
    voiceAccent: 'en-GB',
    level: 'Intermediate',
    items: [
      {
        text: 'Good morning, I saw on the daily report that our file server backup failed three nights in a row.',
        translation:
          '[Shift Operator] Chào buổi sáng, mình thấy trên báo cáo hằng ngày là bản sao lưu máy chủ tệp lỗi ba đêm liên tiếp rồi.',
        hint: 'daily report, three nights in a row',
      },
      {
        text: 'Three nights? Why did the monitoring board only show a yellow warning instead of a red alert?',
        translation:
          '[Backup Eng] Ba đêm cơ à? Sao bảng giám sát chỉ hiện cảnh báo vàng thay vì cảnh báo đỏ vậy?',
        hint: 'monitoring board, instead of',
      },
      {
        text: 'The alert rule only turns red after five failures, which feels much too late for important company files.',
        translation:
          '[Shift Operator] Quy tắc cảnh báo chỉ chuyển đỏ sau năm lần lỗi, như vậy quá trễ đối với dữ liệu công ty quan trọng.',
        hint: 'too late, company files',
      },
      {
        text: 'You are completely right; let us fix the broken backup first and change that alert rule right after.',
        translation:
          '[Backup Eng] Bạn nói hoàn toàn đúng; trước hết hãy sửa bản sao lưu hỏng rồi đổi quy tắc cảnh báo ngay sau đó.',
        hint: 'broken backup, alert rule',
      },
      {
        text: 'I opened last night’s backup log, and the job failed right at the start with an access denied message.',
        translation:
          '[Shift Operator] Mình mở nhật ký sao lưu đêm qua, tác vụ lỗi ngay từ đầu với thông báo bị từ chối truy cập.',
        hint: 'access denied',
      },
      {
        text: 'Access denied usually means our cloud storage key expired or someone changed folder permissions.',
        translation:
          '[Backup Eng] Từ chối truy cập thường có nghĩa khóa lưu trữ đám mây đã hết hạn hoặc có ai đổi quyền thư mục.',
        hint: 'cloud storage key, permissions',
      },
      {
        text: 'Let me check the service account page; yes, the backup access key expired on Monday evening.',
        translation:
          '[Backup Eng] Để tôi xem trang tài khoản dịch vụ; đúng rồi, khóa truy cập sao lưu vừa hết hạn tối thứ Hai.',
        hint: 'service account, access key',
      },
      {
        text: 'Are all our local backup copies from the past week still safe on the office storage server?',
        translation:
          '[Shift Operator] Toàn bộ bản sao lưu nội bộ tuần qua vẫn an toàn trên máy chủ lưu trữ văn phòng chứ?',
        hint: 'local backup copies, storage server',
      },
      {
        text: 'Yes, local backups worked fine; only the cloud backup upload failed because of the expired key.',
        translation:
          '[Backup Eng] Có, bản sao lưu nội bộ vẫn chạy tốt; chỉ bước tải lên đám mây bị lỗi do khóa hết hạn.',
        hint: 'cloud backup upload',
      },
      {
        text: 'I am creating a new service key now and updating the saved key inside our backup tool.',
        translation:
          '[Backup Eng] Tôi đang tạo khóa dịch vụ mới và cập nhật khóa đã lưu bên trong công cụ sao lưu.',
        hint: 'saved key, backup tool',
      },
      {
        text: 'Should we wait until midnight to see if it works, or run a manual backup right now?',
        translation:
          '[Shift Operator] Ta có nên đợi tới nửa đêm xem có chạy không, hay chạy sao lưu thủ công ngay bây giờ?',
        hint: 'manual backup',
      },
      {
        text: 'Never wait until midnight after three failures; let us start a quick upload of new files right away.',
        translation:
          '[Backup Eng] Đừng bao giờ đợi tới nửa đêm sau ba lần lỗi; hãy chạy tải lên nhanh các tệp mới ngay lập tức.',
        hint: 'quick upload, right away',
      },
      {
        text: 'The upload started cleanly and is sending files at forty megabytes per second.',
        translation:
          '[Shift Operator] Quá trình tải lên đã chạy gọn và đang gửi tệp ở tốc độ bốn mươi megabyte mỗi giây.',
        hint: 'sending files, per second',
      },
      {
        text: 'Since it only uploads changed files, it should finish within five minutes.',
        translation:
          '[Backup Eng] Vì chỉ tải lên các tệp đã thay đổi nên chắc sẽ xong trong vòng năm phút thôi.',
        hint: 'changed files, within five minutes',
      },
      {
        text: 'It just finished with zero errors! Let us also restore one test folder to staging to be sure.',
        translation:
          '[Shift Operator] Vừa chạy xong không một lỗi nào! Mình cũng khôi phục thử một thư mục mẫu lên staging cho chắc nhé.',
        hint: 'to be sure, staging',
      },
      {
        text: 'The test restore worked and every document opened with no errors.',
        translation:
          '[Backup Eng] Bản khôi phục thử đã chạy tốt và mọi tài liệu đều mở được không có lỗi nào.',
        hint: 'test restore, no errors',
      },
      {
        text: 'Now I am updating the alert rule so even a single missed backup sends a red ticket the next morning.',
        translation:
          '[Backup Eng] Giờ tôi cập nhật quy tắc cảnh báo để chỉ cần lỡ một lần sao lưu là gửi phiếu đỏ ngay sáng hôm sau.',
        hint: 'alert rule, missed backup',
      },
      {
        text: 'Thanks a lot, I will add a calendar reminder to change the storage key before it expires in three months.',
        translation:
          '[Shift Operator] Cảm ơn nhiều nhé, mình sẽ thêm nhắc lịch đổi khóa lưu trữ trước khi hết hạn trong ba tháng tới.',
        hint: 'calendar reminder, in three months',
      },
    ],
  },
  {
    id: 'lesson-audio-itops-b1-09',
    videoId: 'audio-itops-b1-09',
    title: 'B1 | 09. Troubleshooting Slow API Calls & Timeout Errors (IT Ops)',
    description:
      'A 2-minute B1 incident call tracing mobile app timeouts through API gateway logs to a slow payment partner and switching to a backup service (~2 min, B1, UK English).',
    voiceAccent: 'en-GB',
    level: 'Intermediate',
    items: [
      {
        text: 'Hi, mobile app users are reporting loading spinners and timeout errors when paying for orders.',
        translation:
          '[App Support] Chào bạn, người dùng ứng dụng di động đang báo vòng xoay tải mãi và lỗi quá thời gian khi thanh toán đơn hàng.',
        hint: 'loading spinners, timeout errors',
      },
      {
        text: 'Let me open the API gateway dashboard; yes, the error rate on the payment endpoint just rose to twelve percent.',
        translation:
          '[SRE] Để tôi mở bảng điều khiển cổng API; đúng rồi, tỷ lệ lỗi trên điểm cuối thanh toán vừa tăng lên 12%.',
        hint: 'API gateway, error rate, endpoint',
      },
      {
        text: 'Are other mobile features like browsing products or viewing order history still working fast?',
        translation:
          '[SRE] Các tính năng di động khác như xem sản phẩm hay lịch sử đơn hàng vẫn chạy nhanh chứ?',
        hint: 'order history, browsing products',
      },
      {
        text: 'Yes, everything else responds in under half a second; only the checkout payment call is hanging.',
        translation:
          '[App Support] Có, mọi thứ khác phản hồi dưới nửa giây; chỉ đúng lời gọi thanh toán lúc đặt hàng bị treo.',
        hint: 'responds, hanging',
      },
      {
        text: 'Let us check the request logs to see whether the delay is inside our own code or an outside partner.',
        translation:
          '[SRE] Hãy kiểm tra nhật ký yêu cầu xem độ trễ nằm trong mã của ta hay ở phía đối tác bên ngoài.',
        hint: 'request logs, outside partner',
      },
      {
        text: 'Look at the time details: our internal service finishes in twenty milliseconds, then waits thirty seconds for the bank API.',
        translation:
          '[SRE] Nhìn chi tiết thời gian này: dịch vụ nội bộ của ta xử lý xong trong 20 mili giây, rồi chờ 30 giây cho API ngân hàng.',
        hint: 'time details, internal service',
      },
      {
        text: 'Thirty seconds is way too long! Let me check the payment partner’s public status page.',
        translation:
          '[App Support] Ba mươi giây là quá lâu rồi! Để tôi kiểm tra trang trạng thái công khai của đối tác thanh toán.',
        hint: 'payment partner, public status page',
      },
      {
        text: 'They just posted an incident notice saying their European payment gateway is running slowly.',
        translation:
          '[App Support] Họ vừa đăng thông báo sự cố nói rằng cổng thanh toán châu Âu của họ đang chạy chậm.',
        hint: 'incident notice, running slowly',
      },
      {
        text: 'Because our timeout was set to thirty seconds, waiting calls are keeping all our payment workers busy.',
        translation:
          '[SRE] Vì thời gian chờ của ta đặt tới ba mươi giây, các cuộc gọi đang chờ đã làm bận hết toàn bộ luồng xử lý thanh toán.',
        hint: 'keeping busy, payment workers',
      },
      {
        text: 'Can we lower the timeout to six seconds and show a polite retry message to users?',
        translation:
          '[App Support] Ta có thể hạ thời gian chờ xuống sáu giây và hiện thông báo mời người dùng thử lại lịch sự không?',
        hint: 'lower the timeout, retry message',
      },
      {
        text: 'Even better, we also have a backup payment service set up and ready for traffic.',
        translation:
          '[SRE] Tốt hơn nữa, ta còn cấu hình sẵn một dịch vụ thanh toán dự phòng và sẵn sàng nhận lưu lượng.',
        hint: 'backup payment service, ready',
      },
      {
        text: 'Let us move fifty percent of checkout traffic to the backup service first and watch the success rate.',
        translation:
          '[SRE] Hãy chuyển trước 50% lưu lượng thanh toán sang dịch vụ dự phòng rồi theo dõi tỷ lệ thành công.',
        hint: 'move traffic, success rate',
      },
      {
        text: 'Payments on the backup gateway are finishing in less than one second with zero timeouts.',
        translation:
          '[App Support] Các giao dịch qua cổng dự phòng đang hoàn tất dưới một giây và không có lỗi quá thời gian nào.',
        hint: 'finishing, zero timeouts',
      },
      {
        text: 'Great, I am moving one hundred percent of payment traffic over until the main partner recovers.',
        translation:
          '[SRE] Tuyệt, tôi chuyển toàn bộ 100% lưu lượng thanh toán sang cho tới khi đối tác chính phục hồi.',
        hint: 'main partner, recovers',
      },
      {
        text: 'I also lowered the gateway timeout to eight seconds and added a safe limit on automatic retries.',
        translation:
          '[SRE] Tôi cũng đã hạ thời gian chờ của cổng xuống tám giây và thêm giới hạn an toàn cho các lần thử lại tự động.',
        hint: 'automatic retries',
      },
      {
        text: 'Support tickets already stopped coming in, and payment success is back to its normal level.',
        translation:
          '[App Support] Phiếu hỗ trợ đã ngừng đổ về rồi, và tỷ lệ thanh toán thành công đã quay về mức bình thường.',
        hint: 'payment success, normal level',
      },
      {
        text: 'Let us keep an eye on the partner status page before switching traffic back tomorrow morning.',
        translation:
          '[SRE] Hãy theo dõi trang trạng thái của đối tác trước khi chuyển lưu lượng quay lại vào sáng mai.',
        hint: 'keep an eye on, switching back',
      },
      {
        text: 'Agreed; having a tested backup gateway really saved our afternoon today.',
        translation:
          '[App Support] Nhất trí; có sẵn cổng dự phòng đã được kiểm thử thực sự cứu nguy cho buổi chiều hôm nay.',
        hint: 'saved our afternoon',
      },
    ],
  },
  {
    id: 'lesson-audio-itops-b1-10',
    videoId: 'audio-itops-b1-10',
    title: 'B1 | 10. Running a Weekly Incident Review & Runbook Update (IT Ops)',
    description:
      'A 2-minute B1 team operations meeting reviewing weekly incidents, reducing noisy alerts, improving step-by-step guides, and helping new engineers (~2 min, B1, UK English).',
    voiceAccent: 'en-GB',
    level: 'Intermediate',
    items: [
      {
        text: 'Welcome to our Friday operations review; let us look calmly at the two incidents we handled this week.',
        translation:
          '[Ops Manager] Chào mừng đến buổi rà soát vận hành thứ Sáu; cùng xem lại bình tĩnh hai sự cố ta xử lý tuần này nhé.',
        hint: 'operations review, handled',
      },
      {
        text: 'Total uptime stayed above ninety nine percent, though Tuesday’s night alert took longer than expected.',
        translation:
          '[SysAdmin] Tổng thời gian hoạt động vẫn trên 99%, nhưng cảnh báo đêm thứ Ba mất thời gian xử lý lâu hơn dự kiến.',
        hint: 'total uptime, longer than expected',
      },
      {
        text: 'What slowed the response down on Tuesday when the queue server stopped processing jobs?',
        translation:
          '[Ops Manager] Điều gì đã làm chậm phản hồi vào thứ Ba khi máy chủ hàng đợi ngừng xử lý tác vụ?',
        hint: 'slowed down, processing jobs',
      },
      {
        text: 'First, our monitoring chat received nearly forty small warnings that night, so the real problem was easy to miss.',
        translation:
          '[SysAdmin] Thứ nhất, nhóm chat giám sát nhận gần bốn mươi cảnh báo nhỏ đêm đó nên rất dễ bỏ sót sự cố thật.',
        hint: 'small warnings, easy to miss',
      },
      {
        text: 'Second, the restart steps in our wiki were old after last month’s server upgrade.',
        translation:
          '[SysAdmin] Thứ hai, các bước khởi động lại trên wiki đã cũ sau đợt nâng cấp máy chủ tháng trước.',
        hint: 'restart steps, server upgrade',
      },
      {
        text: 'That is very clear feedback; noisy alerts tire out the on call team and slow down real fixes.',
        translation:
          '[Ops Manager] Phản hồi rất rõ ràng; cảnh báo ồn ào làm đội trực mệt mỏi và làm chậm việc sửa lỗi thật.',
        hint: 'noisy alerts, tire out',
      },
      {
        text: 'Which of those forty small warnings can we safely turn off or put into a daily summary email?',
        translation:
          '[Ops Manager] Trong bốn mươi cảnh báo nhỏ đó, loại nào ta có thể tắt an toàn hoặc gom thành email tổng hợp hằng ngày?',
        hint: 'turn off, daily summary',
      },
      {
        text: 'Short CPU jumps that last under thirty seconds never need to wake someone up at three in the morning.',
        translation:
          '[SysAdmin] Các đợt tăng CPU ngắn dưới ba mươi giây không bao giờ cần đánh thức ai đó lúc ba giờ sáng.',
        hint: 'CPU jumps, wake someone up',
      },
      {
        text: 'Agreed; let us wait until high CPU stays above eighty five percent for five minutes before calling the on call engineer.',
        translation:
          '[Ops Manager] Nhất trí; hãy chờ CPU cao duy trì trên 85% suốt năm phút rồi mới gọi kỹ sư trực.',
        hint: 'on call engineer, stays above',
      },
      {
        text: 'What about updating our incident guides so new shift engineers can follow them easily?',
        translation:
          '[Ops Manager] Còn việc cập nhật hướng dẫn sự cố để các kỹ sư ca mới làm theo thật dễ dàng thì sao?',
        hint: 'shift engineers, easily',
      },
      {
        text: 'I already rewrote the queue server guide with exact commands, expected results, and clear rollback steps.',
        translation:
          '[SysAdmin] Tôi đã viết lại hướng dẫn máy chủ hàng đợi với câu lệnh chính xác, kết quả mong đợi và bước hoàn tác rõ ràng.',
        hint: 'exact commands, expected results',
      },
      {
        text: 'Can we ask one of our newer engineers to test that guide on staging next Tuesday?',
        translation:
          '[Ops Manager] Ta có thể nhờ một kỹ sư mới chạy thử hướng dẫn đó trên môi trường staging thứ Ba tới không?',
        hint: 'newer engineers, test on staging',
      },
      {
        text: 'Great idea; if a new team member can follow every step smoothly, we know the document is really clear.',
        translation:
          '[SysAdmin] Ý tuyệt vời; nếu thành viên mới làm theo trôi chảy từng bước thì ta biết tài liệu thực sự rõ ràng.',
        hint: 'really clear, follow every step',
      },
      {
        text: 'Let us also link each monitoring alert directly to its matching guide page.',
        translation:
          '[Ops Manager] Hãy gắn luôn đường dẫn trực tiếp từ mỗi cảnh báo giám sát tới trang hướng dẫn tương ứng.',
        hint: 'link directly, matching guide',
      },
      {
        text: 'That saves important minutes during an urgent phone call because nobody has to search through old folders.',
        translation:
          '[SysAdmin] Việc đó tiết kiệm những phút quan trọng trong cuộc gọi khẩn cấp vì không ai phải lục tìm thư mục cũ.',
        hint: 'important minutes, urgent phone call',
      },
      {
        text: 'Before we finish, is there any maintenance or risky release planned for next week?',
        translation:
          '[Ops Manager] Trước khi kết thúc, tuần tới có lịch bảo trì hay bản phát hành rủi ro nào không?',
        hint: 'maintenance, planned',
      },
      {
        text: 'Only a normal security update on Wednesday evening, and backups are already checked and ready.',
        translation:
          '[SysAdmin] Chỉ có một đợt cập nhật bảo mật bình thường tối thứ Tư, và các bản sao lưu đều đã kiểm tra sẵn sàng.',
        hint: 'security update, checked and ready',
      },
      {
        text: 'Great work everyone; fewer noisy alerts and clearer guides will make next week much calmer.',
        translation:
          '[Ops Manager] Cả đội làm rất tốt; ít cảnh báo nhiễu hơn và hướng dẫn rõ hơn sẽ giúp tuần tới nhẹ nhàng hơn nhiều.',
        hint: 'much calmer',
      },
    ],
  },
]

export const DEFAULT_A2_B1_AUDIO_LESSONS: Lesson[] = RAW_IT_OPS_A2_B1_SPECS.map(buildLesson)
export const DEFAULT_IT_OPS_B1_B2_AUDIO_LESSONS: Lesson[] = RAW_IT_OPS_B1_SPECS.map(buildLesson)
export const DEFAULT_B1_B2_AUDIO_LESSONS: Lesson[] = [
  ...DEFAULT_A2_B1_AUDIO_LESSONS,
  ...DEFAULT_IT_OPS_B1_B2_AUDIO_LESSONS,
]
export const DEFAULT_IT_OPS_AUDIO_LESSONS = DEFAULT_B1_B2_AUDIO_LESSONS
