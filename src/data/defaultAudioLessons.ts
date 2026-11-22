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
  {
    id: 'lesson-audio-itops-a2-07',
    videoId: 'audio-itops-a2-07',
    title: 'A2-B1 | 07. High CPU Alert on Web Server (IT Ops)',
    description:
      'Simple on-call call checking a high CPU alert on a live web server, moving traffic away, and safely restarting the app (~1 min, A2-B1, UK English).',
    voiceAccent: 'en-GB',
    level: 'Beginner',
    items: [
      {
        text: 'Hi Mark, sorry to call late, but web server three just hit ninety percent CPU.',
        translation:
          '[NOC] Chào Mark, xin lỗi đã gọi muộn, nhưng máy chủ web số ba vừa chạm 90% CPU.',
        hint: 'call late, web server, ninety percent',
      },
      {
        text: 'I am opening the monitoring screen now; are customer pages loading slowly?',
        translation:
          '[Ops] Tôi đang mở màn hình giám sát; trang của khách hàng có đang tải chậm không?',
        hint: 'monitoring screen, loading slowly',
      },
      {
        text: 'Yes, pages take three seconds to open, and memory keeps going up.',
        translation:
          '[NOC] Có, trang mất ba giây để mở, và bộ nhớ cứ tiếp tục tăng lên.',
        hint: 'three seconds, memory, going up',
      },
      {
        text: 'That sounds like the app is using too much memory after tonight’s update.',
        translation:
          '[Ops] Nghe có vẻ ứng dụng đang dùng quá nhiều bộ nhớ sau bản cập nhật tối nay.',
        hint: 'too much memory, update',
      },
      {
        text: 'Should I restart the web service right now to bring the CPU down?',
        translation:
          '[NOC] Tôi có nên khởi động lại dịch vụ web ngay để hạ CPU xuống không?',
        hint: 'restart, web service, bring down',
      },
      {
        text: 'Wait a moment; move users to our other servers first so nobody gets cut off.',
        translation:
          '[Ops] Chờ một chút; hãy chuyển người dùng sang các máy chủ khác trước để không ai bị ngắt kết nối.',
        hint: 'move users, cut off',
      },
      {
        text: 'Okay, traffic is safely moved, and I saved a quick log file for your review.',
        translation:
          '[NOC] Rồi, lưu lượng đã được chuyển an toàn, và tôi đã lưu nhanh tệp log để anh xem.',
        hint: 'safely moved, log file, review',
      },
      {
        text: 'Great, now switch back to the earlier version and watch the CPU graph.',
        translation:
          '[Ops] Tuyệt, giờ hãy quay về phiên bản trước đó và theo dõi biểu đồ CPU nhé.',
        hint: 'switch back, earlier version, graph',
      },
      {
        text: 'Done, CPU dropped to twenty percent, and the website feels fast again.',
        translation:
          '[NOC] Xong rồi, CPU giảm xuống 20% và trang web lại chạy nhanh trở lại.',
        hint: 'dropped, fast again',
      },
    ],
  },
  {
    id: 'lesson-audio-itops-a2-08',
    videoId: 'audio-itops-a2-08',
    title: 'A2-B1 | 08. Website Security Warning & SSL Fix (IT Ops)',
    description:
      'Clear workplace call fixing an expired website security certificate after users report a browser warning (~1 min, A2-B1, UK English).',
    voiceAccent: 'en-GB',
    level: 'Beginner',
    items: [
      {
        text: 'Hello Sarah, customers are calling because browsers show a red security warning on our site.',
        translation:
          '[Helpdesk] Chào Sarah, khách hàng đang gọi báo trình duyệt hiện cảnh báo bảo mật màu đỏ trên trang của mình.',
        hint: 'browsers, security warning',
      },
      {
        text: 'Let me check the website lock icon; oh no, our SSL certificate expired ten minutes ago.',
        translation:
          '[Infra] Để tôi kiểm tra biểu tượng ổ khóa trang web; ôi không, chứng chỉ SSL của ta vừa hết hạn mười phút trước.',
        hint: 'lock icon, SSL certificate, expired',
      },
      {
        text: 'I thought our server updated every security certificate automatically before it ended.',
        translation:
          '[Helpdesk] Tôi tưởng máy chủ tự động cập nhật mọi chứng chỉ bảo mật trước khi hết hạn chứ.',
        hint: 'updated, automatically',
      },
      {
        text: 'A firewall rule blocked the check yesterday, so the auto update did not finish.',
        translation:
          '[Infra] Một quy tắc tường lửa đã chặn bước kiểm tra hôm qua, nên việc tự cập nhật không chạy xong.',
        hint: 'firewall rule, blocked, auto update',
      },
      {
        text: 'How quickly can we fix the site without kicking out users who are already logged in?',
        translation:
          '[Helpdesk] Ta có thể sửa trang web nhanh cỡ nào mà không đẩy người dùng đang đăng nhập ra ngoài?',
        hint: 'kicking out, logged in',
      },
      {
        text: 'I am uploading the new certificate file to our main web server right now.',
        translation:
          '[Infra] Tôi đang tải tệp chứng chỉ mới lên máy chủ web chính ngay bây giờ.',
        hint: 'uploading, certificate file',
      },
      {
        text: 'Next, I will reload the web server softly so current sessions keep working smoothly.',
        translation:
          '[Infra] Tiếp theo, tôi sẽ nạp lại máy chủ web nhẹ nhàng để các phiên hiện tại vẫn chạy mượt.',
        hint: 'reload, current sessions, smoothly',
      },
      {
        text: 'The lock icon is green again; let us add a reminder thirty days before it expires next time.',
        translation:
          '[Helpdesk] Biểu tượng ổ khóa đã xanh trở lại; lần tới nhớ thêm nhắc nhở trước 30 ngày hết hạn nhé.',
        hint: 'green again, reminder, thirty days',
      },
    ],
  },
  {
    id: 'lesson-audio-itops-a2-09',
    videoId: 'audio-itops-a2-09',
    title: 'A2-B1 | 09. Large Log Files Filling Up Disk Space (IT Ops)',
    description:
      'Straightforward Linux operations call finding a huge debug log file on a full disk and clearing it safely (~1 min, A2-B1, UK English).',
    voiceAccent: 'en-GB',
    level: 'Beginner',
    items: [
      {
        text: 'Hey Kevin, our billing server stopped saving new orders and sent a full disk alert.',
        translation:
          '[Monitoring] Chào Kevin, máy chủ thanh toán vừa ngừng lưu đơn hàng mới và gửi cảnh báo đầy ổ đĩa.',
        hint: 'billing server, full disk alert',
      },
      {
        text: 'I just checked the drive, and the main system disk is one hundred percent full.',
        translation:
          '[SysAdmin] Tôi vừa kiểm tra ổ đĩa, và ổ hệ thống chính đã đầy 100%.',
        hint: 'checked the drive, system disk',
      },
      {
        text: 'Did customer orders grow suddenly, or is another file taking all the space?',
        translation:
          '[Monitoring] Do đơn hàng tăng đột ngột, hay có tệp nào khác đang chiếm hết dung lượng?',
        hint: 'grow suddenly, taking all the space',
      },
      {
        text: 'Someone left detailed error logging turned on, creating one huge forty gigabyte file.',
        translation:
          '[SysAdmin] Ai đó quên tắt chế độ ghi log lỗi chi tiết, tạo ra một tệp khổng lồ nặng 40 gigabyte.',
        hint: 'error logging, huge, gigabyte',
      },
      {
        text: 'Can we simply delete that big log file right now to get our space back?',
        translation:
          '[Monitoring] Ta có thể xóa thẳng tệp log lớn đó ngay để lấy lại dung lượng không?',
        hint: 'simply delete, get space back',
      },
      {
        text: 'Not directly, because the running app is still writing to that open file.',
        translation:
          '[SysAdmin] Không xóa trực tiếp được, vì ứng dụng đang chạy vẫn đang ghi vào tệp đang mở đó.',
        hint: 'directly, running app, open file',
      },
      {
        text: 'Instead, I will clear the file content safely and turn off extra debug logs.',
        translation:
          '[SysAdmin] Thay vào đó, tôi sẽ làm rỗng nội dung tệp an toàn và tắt chế độ ghi log gỡ lỗi thừa.',
        hint: 'clear content, safely, debug logs',
      },
      {
        text: 'Orders are saving again right away; tomorrow let us set up automatic daily log cleanup.',
        translation:
          '[Monitoring] Đơn hàng đã lưu lại được ngay; ngày mai ta hãy cài dọn log tự động hằng ngày nhé.',
        hint: 'right away, daily log cleanup',
      },
    ],
  },
  {
    id: 'lesson-audio-itops-a2-10',
    videoId: 'audio-itops-a2-10',
    title: 'A2-B1 | 10. Slow Database & Waiting Customer Orders (IT Ops)',
    description:
      'Clear incident call between Support and a Database Admin stopping a heavy report that is slowing down customer checkout (~1 min, A2-B1, UK English).',
    voiceAccent: 'en-GB',
    level: 'Beginner',
    items: [
      {
        text: 'Hi Priya, customers say the checkout page keeps spinning and never finishes their order.',
        translation:
          '[Support] Chào Priya, khách hàng báo trang thanh toán cứ xoay mãi mà không hoàn tất đơn hàng.',
        hint: 'checkout page, spinning, order',
      },
      {
        text: 'I see many database requests waiting in line because a big sales report is running.',
        translation:
          '[DBA] Tôi thấy nhiều yêu cầu cơ sở dữ liệu đang xếp hàng chờ vì một báo cáo doanh số lớn đang chạy.',
        hint: 'waiting in line, sales report',
      },
      {
        text: 'Why is that sales report taking almost one minute to finish today?',
        translation:
          '[Support] Tại sao hôm nay báo cáo doanh số đó lại mất gần một phút mới chạy xong vậy?',
        hint: 'almost one minute, finish',
      },
      {
        text: 'It is reading five million rows one by one because the table is missing a search index.',
        translation:
          '[DBA] Nó đang đọc từng dòng qua năm triệu bản ghi vì bảng đó bị thiếu chỉ mục tìm kiếm.',
        hint: 'five million rows, missing, search index',
      },
      {
        text: 'Can we stop that slow report first so live customer orders can go through?',
        translation:
          '[Support] Ta có thể dừng báo cáo chậm đó trước để đơn hàng của khách đi qua được không?',
        hint: 'stop, live orders, go through',
      },
      {
        text: 'Done, the waiting queue just cleared, and I moved reports to our backup read server.',
        translation:
          '[DBA] Xong rồi, hàng chờ vừa thông thoáng, và tôi đã chuyển báo cáo sang máy chủ đọc dự phòng.',
        hint: 'waiting queue, cleared, backup read server',
      },
      {
        text: 'Should we add the missing index tonight when the shop is quiet?',
        translation:
          '[Support] Ta có nên thêm chỉ mục còn thiếu vào tối nay khi cửa hàng vắng khách không?',
        hint: 'tonight, quiet',
      },
      {
        text: 'Yes, I will add it carefully tonight without stopping the website at all.',
        translation:
          '[DBA] Có, tối nay tôi sẽ thêm cẩn thận mà không cần dừng trang web chút nào.',
        hint: 'carefully, without stopping',
      },
    ],
  },
  {
    id: 'lesson-audio-itops-a2-12',
    videoId: 'audio-itops-a2-12',
    title: 'A2-B1 | 12. New App Update Crashing After Release (IT Ops)',
    description:
      'Simple DevOps release call diagnosing a crashing payment service after deployment, finding a missing key, and rolling back (~1 min, A2-B1, UK English).',
    voiceAccent: 'en-GB',
    level: 'Beginner',
    items: [
      {
        text: 'Elena, right after we pushed the new payment update, the app started crashing every ten seconds.',
        translation:
          '[Release] Elena ơi, ngay sau khi ta đẩy bản cập nhật thanh toán mới, ứng dụng bắt đầu bị sập mỗi mười giây.',
        hint: 'pushed, payment update, crashing',
      },
      {
        text: 'Pause the rollout right now; are the old app servers still serving our customers?',
        translation:
          '[DevOps] Tạm dừng triển khai ngay; các máy chủ ứng dụng cũ có vẫn đang phục vụ khách hàng không?',
        hint: 'pause, rollout, serving',
      },
      {
        text: 'Yes, the system blocked the broken servers automatically, so customers have not noticed yet.',
        translation:
          '[Release] Có, hệ thống đã tự động chặn các máy chủ bị lỗi nên khách hàng vẫn chưa nhận ra.',
        hint: 'broken servers, noticed',
      },
      {
        text: 'I am reading the error logs now to see why the new version keeps stopping.',
        translation:
          '[DevOps] Tôi đang đọc nhật ký lỗi để xem vì sao phiên bản mới cứ tự dừng.',
        hint: 'error logs, keeps stopping',
      },
      {
        text: 'Is the app running out of memory, or did a setting file go missing?',
        translation:
          '[Release] Ứng dụng bị hết bộ nhớ, hay có tệp cài đặt nào bị thiếu vậy?',
        hint: 'running out of memory, setting file',
      },
      {
        text: 'Memory is totally fine; the app crashed because one payment password is missing in settings.',
        translation:
          '[DevOps] Bộ nhớ hoàn toàn ổn; ứng dụng sập vì thiếu một mật khẩu thanh toán trong phần cài đặt.',
        hint: 'totally fine, missing in settings',
      },
      {
        text: 'Let us roll back to the previous version now so everything stays clean and safe.',
        translation:
          '[Release] Hãy quay lại phiên bản trước ngay để mọi thứ luôn gọn gàng và an toàn.',
        hint: 'roll back, previous version',
      },
      {
        text: 'Rollback is complete, all servers are green, and we will double check settings before trying tomorrow.',
        translation:
          '[DevOps] Hoàn tác xong rồi, mọi máy chủ đều xanh, và ta sẽ kiểm tra kỹ cài đặt trước khi thử lại vào ngày mai.',
        hint: 'rollback, double check, tomorrow',
      },
    ],
  },
  {
    id: 'lesson-audio-itops-a2-14',
    videoId: 'audio-itops-a2-14',
    title: 'A2-B1 | 14. Blocking Strange Login Attempts on Server (IT Ops)',
    description:
      'A2-B1 security call blocking repeated failed SSH login attempts at the firewall and disabling password logins (~1 min, A2-B1, UK English).',
    voiceAccent: 'en-GB',
    level: 'Beginner',
    items: [
      {
        text: 'Hi Leo, our security tool just reported thousands of failed logins on edge server two.',
        translation:
          '[SOC] Chào Leo, công cụ bảo mật vừa báo hàng nghìn lượt đăng nhập thất bại trên máy chủ biên số hai.',
        hint: 'security tool, failed logins',
      },
      {
        text: 'Thanks for telling me quickly; did any unknown user actually get into the server?',
        translation:
          '[SysOps] Cảm ơn đã báo sớm; có người dùng lạ nào thực sự vào được máy chủ không?',
        hint: 'unknown user, get into',
      },
      {
        text: 'No one got in yet, but the login attempts are coming from many strange foreign addresses.',
        translation:
          '[SOC] Chưa ai vào được, nhưng các lượt đăng nhập đến từ nhiều địa chỉ nước ngoài lạ.',
        hint: 'login attempts, foreign addresses',
      },
      {
        text: 'I am adding a block rule on our main firewall right now to stop all of them.',
        translation:
          '[SysOps] Tôi đang thêm quy tắc chặn trên tường lửa chính ngay để dừng tất cả các địa chỉ đó.',
        hint: 'block rule, main firewall',
      },
      {
        text: 'Why was the admin login port open to the public internet in the first place?',
        translation:
          '[SOC] Ngay từ đầu tại sao cổng đăng nhập quản trị lại mở ra internet công cộng vậy?',
        hint: 'admin port, public internet',
      },
      {
        text: 'An outside helper opened it during setup last week and forgot to close it afterwards.',
        translation:
          '[SysOps] Một kỹ thuật viên bên ngoài đã mở nó lúc cài đặt tuần trước và quên đóng lại sau đó.',
        hint: 'outside helper, forgot to close',
      },
      {
        text: 'Please turn off normal password login so only approved security keys can connect.',
        translation:
          '[SOC] Vui lòng tắt đăng nhập bằng mật khẩu thường để chỉ các khóa bảo mật được duyệt mới kết nối được.',
        hint: 'password login, security keys',
      },
      {
        text: 'Done, the firewall is locked down, old keys are replaced, and the alert count dropped to zero.',
        translation:
          '[SysOps] Xong rồi, tường lửa đã khóa chặt, khóa cũ đã thay mới và số cảnh báo đã giảm về không.',
        hint: 'locked down, replaced, zero',
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
          '[Monitoring] Alo, mình gọi báo là RAM trên server ứng dụng số 2 vừa vượt quá 85% rồi.',
        hint: 'memory usage, application server',
      },
      {
        text: 'Thanks for telling me early; did the jump happen suddenly, or has it been going up slowly?',
        translation:
          '[SysAdmin] Cảm ơn đã báo sớm nhé; nó tăng vọt đột ngột hay tăng dần từ từ vậy?',
        hint: 'suddenly, going up slowly',
      },
      {
        text: 'Looking at the chart, memory started rising steadily right after last night’s software update.',
        translation:
          '[Monitoring] Nhìn trên biểu đồ thì RAM bắt đầu tăng đều ngay sau đợt cập nhật phần mềm tối qua.',
        hint: 'chart, rising steadily, software update',
      },
      {
        text: 'Are the other application servers showing the same rise on the dashboard?',
        translation:
          '[SysAdmin] Các server ứng dụng khác trên dashboard có bị tăng giống vậy không?',
        hint: 'same rise, dashboard',
      },
      {
        text: 'Yes, server one is already at seventy eight percent, and server three is close behind.',
        translation:
          '[Monitoring] Có đó, server 1 đã lên 78% rồi, còn server 3 cũng sắp tới mức đó.',
        hint: 'close behind',
      },
      {
        text: 'That clearly shows the new version is not freeing memory after finishing background tasks.',
        translation:
          '[SysAdmin] Vậy rõ ràng là bản mới không giải phóng RAM sau khi chạy xong các tác vụ nền rồi.',
        hint: 'clearly shows, freeing memory, background tasks',
      },
      {
        text: 'Are customers seeing slow page loads or error messages on the website right now?',
        translation:
          '[SysAdmin] Hiện tại khách hàng vào web có bị tải chậm hay gặp thông báo lỗi gì chưa?',
        hint: 'page loads, error messages',
      },
      {
        text: 'Not yet, response times are still normal, though we might hit the limit within two hours.',
        translation:
          '[Monitoring] Chưa đâu, tốc độ phản hồi vẫn bình thường, nhưng khoảng hai tiếng nữa là có thể chạm ngưỡng.',
        hint: 'response times, hit the limit',
      },
      {
        text: 'Let us act before users notice; first, remove server two from the active load balancer.',
        translation:
          '[SysAdmin] Mình xử lý trước khi người dùng nhận ra nhé; trước hết tách server 2 ra khỏi load balancer đang chạy đi.',
        hint: 'act before, load balancer',
      },
      {
        text: 'Should I wait for current user sessions to finish before stopping the application service?',
        translation:
          '[Monitoring] Có cần đợi các phiên người dùng đang mở xong hẳn rồi mới tắt service ứng dụng không?',
        hint: 'user sessions, application service',
      },
      {
        text: 'Yes, give it thirty seconds to finish current connections so nobody loses their shopping cart.',
        translation:
          '[SysAdmin] Có chứ, đợi 30 giây cho các kết nối hiện tại xử lý xong để không ai bị mất giỏ hàng.',
        hint: 'current connections, shopping cart',
      },
      {
        text: 'Server two has no active users now; do you want a quick memory report before I restart it?',
        translation:
          '[Monitoring] Server 2 hết người dùng kết nối rồi; bạn có cần xuất nhanh báo cáo bộ nhớ trước khi mình khởi động lại không?',
        hint: 'active users, memory report',
      },
      {
        text: 'Please save the process list and memory report into our shared support folder.',
        translation:
          '[SysAdmin] Lưu giúp mình danh sách tiến trình với báo cáo bộ nhớ vào thư mục hỗ trợ dùng chung nhé.',
        hint: 'process list, support folder',
      },
      {
        text: 'Both files are saved cleanly, and I am restarting the service on server two right now.',
        translation:
          '[Monitoring] Mình lưu xong cả hai file rồi, giờ đang khởi động lại service trên server 2 đây.',
        hint: 'saved cleanly',
      },
      {
        text: 'Once health checks pass, add server two back, then we will return to the previous stable version.',
        translation:
          '[SysAdmin] Đợi health check báo xanh thì đưa server 2 vào lại, xong mình quay về phiên bản ổn định trước đó nhé.',
        hint: 'health checks, stable version',
      },
      {
        text: 'Server two is healthy at thirty percent memory, and I am updating server one next.',
        translation:
          '[Monitoring] Server 2 ổn rồi, RAM xuống còn 30%, giờ mình làm tiếp sang server 1.',
        hint: 'healthy, updating',
      },
      {
        text: 'I will share the memory report with the development team so they can fix the problem today.',
        translation:
          '[SysAdmin] Để mình gửi báo cáo bộ nhớ cho team dev để họ sửa lỗi ngay hôm nay.',
        hint: 'development team, fix the problem',
      },
      {
        text: 'All three servers are stable again, and I will keep watching the memory chart for the next hour.',
        translation:
          '[Monitoring] Cả ba server đều ổn định lại rồi, mình sẽ theo dõi thêm biểu đồ RAM trong một tiếng nữa cho chắc.',
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
          '[Branch Support] Alo, sáng nay nhân viên bên văn phòng Manchester không mở được hệ thống tài chính nội bộ.',
        hint: 'office, internal finance system',
      },
      {
        text: 'Can they still open normal public websites, or is the whole office internet connection down?',
        translation:
          '[Network Eng] Mọi người vẫn vào các trang web bên ngoài bình thường hay cả mạng văn phòng bị mất luôn?',
        hint: 'public websites, connection down',
      },
      {
        text: 'Public websites work fine, and office email loads quickly, so only internal tools are failing.',
        translation:
          '[Branch Support] Web ngoài vẫn vào bình thường, email công ty cũng chạy nhanh, chỉ có các hệ thống nội bộ là lỗi thôi.',
        hint: 'internal tools, failing',
      },
      {
        text: 'That sounds like a problem with the secure VPN tunnel between Manchester and our main data centre.',
        translation:
          '[Network Eng] Nghe giống bị lỗi đường kết nối VPN giữa chi nhánh Manchester với trung tâm dữ liệu chính rồi.',
        hint: 'VPN tunnel, data centre',
      },
      {
        text: 'Let me log into the main network gateway and check the tunnel status right away.',
        translation:
          '[Network Eng] Để mình đăng nhập vào thiết bị gateway chính kiểm tra trạng thái kết nối VPN ngay.',
        hint: 'network gateway, tunnel status',
      },
      {
        text: 'Yes, the tunnel went offline at six thirty this morning and keeps failing to reconnect.',
        translation:
          '[Network Eng] Đúng rồi, kết nối VPN bị ngắt từ 6 giờ 30 sáng nay và tự kết nối lại hoài không được.',
        hint: 'went offline, reconnect',
      },
      {
        text: 'Did someone change the office firewall rules last night, or did the internet provider have an issue?',
        translation:
          '[Branch Support] Tối qua có ai chỉnh luật firewall ở văn phòng không, hay do bên nhà mạng gặp trục trặc?',
        hint: 'firewall rules, internet provider',
      },
      {
        text: 'The gateway logs show a login error because the shared security key expired today.',
        translation:
          '[Network Eng] Log trên gateway báo lỗi xác thực vì khóa bảo mật dùng chung vừa hết hạn hôm nay.',
        hint: 'shared security key, expired',
      },
      {
        text: 'I did not know those tunnel keys had a fixed yearly expiry date.',
        translation:
          '[Branch Support] Mình không biết là mấy khóa VPN đó có hạn cố định theo từng năm luôn đấy.',
        hint: 'yearly, expiry date',
      },
      {
        text: 'We change them every twelve months for security, and the reminder ticket was missed last week.',
        translation:
          '[Network Eng] Bên mình đổi định kỳ mỗi 12 tháng để đảm bảo bảo mật, mà tuần trước bị sót mất ticket nhắc lịch.',
        hint: 'reminder ticket, missed',
      },
      {
        text: 'Can you update the key from the main office, or do I need to plug into the local router?',
        translation:
          '[Branch Support] Bạn cập nhật khóa từ văn phòng chính được không, hay mình phải cắm dây trực tiếp vào router ở đây?',
        hint: 'main office, local router',
      },
      {
        text: 'I can reach the branch router over our backup management line, so no cables are needed.',
        translation:
          '[Network Eng] Mình truy cập được router chi nhánh qua đường quản trị dự phòng nên không cần cắm dây đâu.',
        hint: 'backup management line, cables',
      },
      {
        text: 'I just created a fresh key and saved the matching settings on both gateway devices.',
        translation:
          '[Network Eng] Mình vừa tạo khóa mới và cấu hình khớp nhau trên cả hai đầu gateway rồi.',
        hint: 'fresh key, matching settings',
      },
      {
        text: 'Now I am restarting the tunnel link; give it twenty seconds to build the secure connection.',
        translation:
          '[Network Eng] Giờ mình khởi động lại kết nối VPN nhé; đợi khoảng 20 giây để hai đầu bắt tay mã hóa.',
        hint: 'restarting, secure connection',
      },
      {
        text: 'The status light just turned green on my screen, and test pings are returning in twelve milliseconds.',
        translation:
          '[Network Eng] Đèn trạng thái trên màn hình vừa chuyển xanh rồi, ping thử phản hồi chỉ 12 mili giây thôi.',
        hint: 'test pings, milliseconds',
      },
      {
        text: 'Let me ask the finance team to refresh their browsers and sign in again right now.',
        translation:
          '[Branch Support] Để mình nhắn team tài chính tải lại trình duyệt và đăng nhập lại xem sao.',
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
          '[Network Eng] Tốt quá; để mình đặt lịch nhắc tự động trước 30 ngày cho đợt đổi khóa năm sau.',
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
          '[Ops Lead] Ê bạn ơi, team marketing vừa gửi email flash sale nên lượng truy cập web tăng gấp đôi rồi.',
        hint: 'flash sale, traffic doubled',
      },
      {
        text: 'I saw the live chart jump a minute ago; how are the web servers handling the load?',
        translation:
          '[Cloud Eng] Nãy mình cũng vừa thấy biểu đồ nhảy vọt; dàn web server chịu tải ổn không?',
        hint: 'live chart, handling the load',
      },
      {
        text: 'Average CPU across the web servers is around seventy five percent, and pages feel slower.',
        translation:
          '[Ops Lead] CPU trung bình trên các web server đang tầm 75%, mở trang bắt đầu thấy hơi chậm rồi.',
        hint: 'average CPU, slower',
      },
      {
        text: 'Did automatic scaling start adding extra server instances when CPU crossed seventy percent?',
        translation:
          '[Cloud Eng] Hệ thống auto-scaling có tự bật thêm server khi CPU vượt 70% không?',
        hint: 'automatic scaling, extra server',
      },
      {
        text: 'It added two servers, but the maximum limit was set to six servers in our scaling rule.',
        translation:
          '[Ops Lead] Nó thêm được hai máy rồi, nhưng giới hạn tối đa trong cấu hình chỉ đang để là 6 server thôi.',
        hint: 'maximum limit, scaling rule',
      },
      {
        text: 'Let us raise that limit to ten servers right now so the system has plenty of extra space.',
        translation:
          '[Cloud Eng] Nâng giới hạn đó lên 10 server ngay đi để hệ thống còn dư sức chịu tải.',
        hint: 'raise that limit, extra space',
      },
      {
        text: 'How long does each new web server take to start up and pass its health check?',
        translation:
          '[Ops Lead] Mỗi web server mới bật lên rồi qua bước health check mất khoảng bao lâu?',
        hint: 'start up, health check',
      },
      {
        text: 'About ninety seconds; two more servers are already starting and should join the balancer soon.',
        translation:
          '[Cloud Eng] Tầm 90 giây thôi; hai server nữa đang khởi động rồi, lát nữa sẽ tự nối vào load balancer.',
        hint: 'ninety seconds, join the balancer',
      },
      {
        text: 'What about the main database? Are heavy product searches putting too much pressure on it?',
        translation:
          '[Ops Lead] Còn database chính thì sao? Khách tìm kiếm sản phẩm nhiều có làm nó quá tải không?',
        hint: 'product searches, pressure',
      },
      {
        text: 'Database reads went up fast, so turning on longer page caching for product lists will help right away.',
        translation:
          '[Cloud Eng] Lượt đọc database tăng nhanh lắm, mình kéo dài thời gian cache cho trang danh sách sản phẩm sẽ đỡ tải ngay.',
        hint: 'went up fast, page caching',
      },
      {
        text: 'Make sure we do not cache personal cart pages or payment checkout screens by mistake.',
        translation:
          '[Ops Lead] Nhớ kiểm tra kỹ kẻo cache nhầm trang giỏ hàng cá nhân hay màn hình thanh toán nhé.',
        hint: 'by mistake, checkout screens',
      },
      {
        text: 'Of course, caching only applies to public product pages, images, and static banner files.',
        translation:
          '[Cloud Eng] Yên tâm, cache chỉ áp dụng cho trang sản phẩm công khai, hình ảnh với các file banner tĩnh thôi.',
        hint: 'product pages, static files',
      },
      {
        text: 'The new cache rule is live, and database read traffic just dropped by nearly forty percent.',
        translation:
          '[Cloud Eng] Cấu hình cache mới chạy rồi, lượng truy vấn đọc database vừa giảm gần 40% luôn.',
        hint: 'cache rule, dropped by nearly',
      },
      {
        text: 'Awesome, and all eight web servers are now green with average CPU back under fifty percent.',
        translation:
          '[Ops Lead] Ngon quá, cả 8 web server đều xanh rồi, CPU trung bình cũng hạ xuống dưới 50%.',
        hint: 'average CPU, under fifty percent',
      },
      {
        text: 'I also ran a quick test order on the checkout page and it finished in under one second.',
        translation:
          '[Cloud Eng] Mình cũng vừa đặt thử một đơn trên trang thanh toán, xử lý xong chưa tới 1 giây.',
        hint: 'test order, finished',
      },
      {
        text: 'Let us ask marketing to tell operations one day ahead before future flash sales.',
        translation:
          '[Ops Lead] Nhắn bên marketing lần sau có flash sale thì báo trước cho bên vận hành một ngày nhé.',
        hint: 'one day ahead, future',
      },
      {
        text: 'Good idea; that way we can prepare the servers and check our limits early.',
        translation:
          '[Cloud Eng] Chuẩn đấy; như vậy mình chủ động chuẩn bị server và kiểm tra hạn mức từ sớm.',
        hint: 'prepare the servers, check our limits',
      },
      {
        text: 'I will stay on the live dashboard until the sale ends and reduce the servers tonight.',
        translation:
          '[Cloud Eng] Mình sẽ canh dashboard trực tiếp tới hết đợt sale, rồi tối nay giảm bớt server lại.',
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
          '[Helpdesk] Chào bạn, nãy giờ mấy khách hàng gọi lên báo vẫn chưa nhận được email xác nhận đơn hàng.',
        hint: 'order confirmation, arrived',
      },
      {
        text: 'Are those emails bouncing back with errors, or are they simply arriving much later than usual?',
        translation:
          '[Mail Admin] Mấy email đó bị trả ngược báo lỗi, hay chỉ đến chậm hơn bình thường nhiều thôi?',
        hint: 'bouncing back, later than usual',
      },
      {
        text: 'They are arriving about forty minutes late, and staff noticed internal messages are delayed too.',
        translation:
          '[Helpdesk] Đến trễ tầm 40 phút lận, mà nhân viên trong công ty cũng thấy thông báo nội bộ bị chậm theo.',
        hint: 'delayed, internal messages',
      },
      {
        text: 'Let me check our outgoing mail server; wow, there are twelve thousand messages stuck in the queue.',
        translation:
          '[Mail Admin] Để mình kiểm tra server gửi mail; trời ơi, đang có tới 12.000 email bị kẹt trong hàng đợi.',
        hint: 'outgoing mail server, stuck in the queue',
      },
      {
        text: 'Twelve thousand? Normally our busy morning queue only holds around two hundred emails.',
        translation:
          '[Helpdesk] 12.000 cái luôn hả? Bình thường buổi sáng cao điểm hàng đợi cũng chỉ tầm 200 email thôi mà.',
        hint: 'normally, holds around',
      },
      {
        text: 'Wait a second, most of these messages are coming from one single automatic reporting account.',
        translation:
          '[Mail Admin] Khoan đã, gần hết đống thư này đều gửi ra từ đúng một tài khoản báo cáo tự động.',
        hint: 'automatic reporting account',
      },
      {
        text: 'What is that account sending? It looks like the same five megabyte attachment repeated every second.',
        translation:
          '[Mail Admin] Tài khoản đó đang gửi gì vậy? Nhìn như cùng một file đính kèm 5 MB mà gửi lặp lại mỗi giây luôn.',
        hint: 'attachment, repeated',
      },
      {
        text: 'Oh no, a scheduled billing script must be stuck in a retry loop after failing once.',
        translation:
          '[Helpdesk] Thôi rồi, chắc script xuất hóa đơn định kỳ bị kẹt vòng lặp gửi lại sau khi lỗi một lần rồi.',
        hint: 'scheduled script, retry loop',
      },
      {
        text: 'Exactly; it filled up all outgoing mail workers, blocking real customer emails behind it.',
        translation:
          '[Mail Admin] Chuẩn luôn; nó chiếm kín hết luồng gửi thư đi, làm nghẽn toàn bộ email khách hàng thật ở phía sau.',
        hint: 'mail workers, blocking',
      },
      {
        text: 'First, I am pausing that automatic sender account so no new copy messages enter the queue.',
        translation:
          '[Mail Admin] Trước mắt mình tạm khóa tài khoản gửi tự động đó để không đẩy thêm thư trùng vào hàng đợi nữa.',
        hint: 'pausing, copy messages',
      },
      {
        text: 'Can we clear out only those repeated report messages without deleting real customer emails?',
        translation:
          '[Helpdesk] Mình dọn riêng mấy thư báo cáo bị lặp đó mà không xóa nhầm email khách hàng thật được không?',
        hint: 'clear out, without deleting',
      },
      {
        text: 'Yes, I can filter the queue by sender address and remove only the stuck reporting job.',
        translation:
          '[Mail Admin] Được chứ, mình lọc hàng đợi theo địa chỉ người gửi rồi xóa riêng tác vụ báo cáo bị kẹt thôi.',
        hint: 'filter the queue, sender address',
      },
      {
        text: 'Done, eleven thousand repeated messages are cleared, leaving only three hundred real customer emails.',
        translation:
          '[Mail Admin] Xong rồi, mình dọn sạch 11.000 thư lặp, giờ chỉ còn 300 email khách hàng thật thôi.',
        hint: 'real customer emails',
      },
      {
        text: 'Now I am pushing the mail queue so the server sends those waiting confirmations right away.',
        translation:
          '[Mail Admin] Giờ mình cho xả hàng đợi để server gửi ngay mấy thư xác nhận đang chờ.',
        hint: 'pushing the mail queue, right away',
      },
      {
        text: 'I just tested a password reset email and it arrived in my inbox within three seconds.',
        translation:
          '[Helpdesk] Mình vừa thử gửi một email đặt lại mật khẩu, 3 giây là tới hộp thư đến rồi.',
        hint: 'arrived in my inbox',
      },
      {
        text: 'Great news; I will also tell the billing team to add a clear retry limit on their script.',
        translation:
          '[Mail Admin] Tốt quá; để mình nhắn thêm team thanh toán đặt giới hạn số lần thử lại cho script của họ.',
        hint: 'clear retry limit',
      },
      {
        text: 'Should we set a queue size alert so operations gets a message if more than five hundred emails wait?',
        translation:
          '[Helpdesk] Mình đặt thêm cảnh báo hàng đợi để nếu có hơn 500 email chờ là bên vận hành nhận tin báo ngay nhé?',
        hint: 'queue size alert',
      },
      {
        text: 'Yes, I am adding that monitoring rule right now along with a per minute sending limit.',
        translation:
          '[Mail Admin] Ừ, mình đang thêm luật giám sát đó ngay đây, kèm luôn giới hạn số thư gửi mỗi phút.',
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
          '[Junior Ops] Chào bạn, mình hơi khó hiểu vì web server báo hết ổ đĩa dù dung lượng trống vẫn còn nhiều.',
        hint: 'confused, no space left',
      },
      {
        text: 'How much free space did the normal disk command show when you checked it?',
        translation:
          '[Linux Eng] Lúc bạn chạy lệnh kiểm tra ổ đĩa bình thường thì thấy còn trống bao nhiêu?',
        hint: 'disk command, free space',
      },
      {
        text: 'It showed thirty five percent free, about forty gigabytes available, yet nothing can create a new file.',
        translation:
          '[Junior Ops] Còn trống tới 35%, khoảng 40 GB lận, vậy mà không chương trình nào tạo file mới được.',
        hint: 'available, create a new file',
      },
      {
        text: 'Aha, that is a common Linux problem; please check the inode usage table right now.',
        translation:
          '[Linux Eng] À, lỗi này trên Linux hay gặp lắm; bạn kiểm tra ngay bảng dung lượng inode đi.',
        hint: 'common problem, inode usage',
      },
      {
        text: 'Oh wow, inode usage on the root drive is at one hundred percent.',
        translation:
          '[Junior Ops] Ôi trời, mức dùng inode trên phân vùng gốc chạm đúng 100% luôn rồi.',
        hint: 'root drive, one hundred percent',
      },
      {
        text: 'Could you quickly explain why a drive runs out of inodes while gigabytes are still free?',
        translation:
          '[Junior Ops] Bạn giải thích nhanh giúp mình sao ổ đĩa lại hết inode trong khi vẫn còn dư mấy chục GB được không?',
        hint: 'quickly explain, runs out of',
      },
      {
        text: 'Every single file needs one inode record, so millions of tiny files can use up every slot.',
        translation:
          '[Linux Eng] Mỗi file dù nhỏ xíu cũng tốn một mục inode, nên hàng triệu file nhỏ sẽ ngốn sạch hết số lượng inode.',
        hint: 'inode record, tiny files, use up',
      },
      {
        text: 'Let us find which folder holds the highest number of small files on this machine.',
        translation:
          '[Linux Eng] Giờ tìm xem thư mục nào trên máy này đang chứa nhiều file nhỏ nhất nhé.',
        hint: 'folder, highest number',
      },
      {
        text: 'Found it; the temporary session folder has over two million tiny files created over three months.',
        translation:
          '[Junior Ops] Thấy rồi; thư mục lưu session tạm có hơn 2 triệu file nhỏ dồn từ 3 tháng nay.',
        hint: 'session folder, two million',
      },
      {
        text: 'Why did our nightly cleanup job stop clearing old session files three months ago?',
        translation:
          '[Linux Eng] Sao tác vụ dọn dẹp hằng đêm lại ngừng xóa mấy file session cũ từ 3 tháng trước vậy?',
        hint: 'nightly cleanup job',
      },
      {
        text: 'Let me check the scheduled task file; someone turned off the cleanup line during testing and forgot.',
        translation:
          '[Junior Ops] Để mình xem file lịch chạy tự động; có ai tắt dòng dọn dẹp lúc test rồi quên bật lại mất.',
        hint: 'scheduled task, turned off, forgot',
      },
      {
        text: 'Good catch; remember not to run a simple delete all command on two million files at once.',
        translation:
          '[Linux Eng] Phát hiện chuẩn đấy; nhớ đừng chạy lệnh xóa hết thông thường một lúc trên 2 triệu file nhé.',
        hint: 'good catch, at once',
      },
      {
        text: 'Right, because the shell command will fail with a too many files error.',
        translation:
          '[Junior Ops] Đúng rồi, chạy vậy lệnh shell sẽ báo lỗi quá nhiều file ngay.',
        hint: 'shell command, too many files',
      },
      {
        text: 'Use the find command to delete in small groups for files older than two days so active sessions stay safe.',
        translation:
          '[Linux Eng] Dùng lệnh find để xóa dần từng nhóm các file cũ hơn hai ngày, như vậy không ảnh hưởng các phiên đang hoạt động.',
        hint: 'small groups, older than, stay safe',
      },
      {
        text: 'It is running smoothly now, and inode usage already dropped from one hundred down to twenty percent.',
        translation:
          '[Junior Ops] Lệnh đang chạy êm rồi, mức dùng inode vừa tụt từ 100% xuống còn 20%.',
        hint: 'running smoothly, dropped',
      },
      {
        text: 'Next, turn the nightly cleanup schedule back on and check that the web app writes logs cleanly.',
        translation:
          '[Linux Eng] Xong rồi bật lại lịch dọn dẹp hằng đêm và kiểm tra xem web app ghi log lại bình thường chưa nhé.',
        hint: 'turn back on, writes logs',
      },
      {
        text: 'Application logs are writing again, and I added an inode alert at eighty percent to our monitoring tool.',
        translation:
          '[Junior Ops] Log ứng dụng ghi lại bình thường rồi, mình cũng thêm cảnh báo inode ở mức 80% trên hệ thống giám sát.',
        hint: 'inode alert, monitoring tool',
      },
      {
        text: 'Nice work today; checking inodes is a very useful habit every Linux engineer should know.',
        translation:
          '[Linux Eng] Làm tốt lắm; kiểm tra inode là thói quen cực kỳ hữu ích mà kỹ sư Linux nào cũng nên nắm.',
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
          '[Project Lead] Chào buổi chiều, mình chốt lại checklist cho đợt chuyển database khách hàng tối thứ Bảy này nhé.',
        hint: 'checklist, database migration',
      },
      {
        text: 'Sure, our current server is almost full, so moving to the new machine is very important.',
        translation:
          '[DBA] Ok, server hiện tại cũng sắp đầy rồi nên chuyển sang máy mới là rất cần thiết.',
        hint: 'almost full, very important',
      },
      {
        text: 'How much total downtime should we tell customers to expect on Saturday night?',
        translation:
          '[Project Lead] Tối thứ Bảy mình nên báo khách hàng thời gian tạm ngưng dự kiến là bao lâu?',
        hint: 'downtime, expect',
      },
      {
        text: 'In our test run on staging yesterday, the final switch took twenty five minutes from start to finish.',
        translation:
          '[DBA] Hôm qua chạy thử trên staging thì bước chuyển cuối cùng mất 25 phút từ đầu tới cuối.',
        hint: 'test run, final switch',
      },
      {
        text: 'Let us share a one hour maintenance window so we have plenty of extra time.',
        translation:
          '[Project Lead] Vậy mình thông báo lịch bảo trì 1 tiếng đi cho dư dả thời gian dự phòng.',
        hint: 'maintenance window, extra time',
      },
      {
        text: 'How are we copying such a large database without keeping the website offline for hours?',
        translation:
          '[Project Lead] Database lớn như vậy mình chuyển kiểu gì để web không bị ngưng hoạt động hàng giờ?',
        hint: 'copying, offline for hours',
      },
      {
        text: 'We already set up live syncing, so the new server gets every change in real time.',
        translation:
          '[DBA] Bên mình cài đồng bộ trực tiếp rồi, nên mọi thay đổi đều tự cập nhật sang server mới theo thời gian thực.',
        hint: 'live syncing, real time',
      },
      {
        text: 'That means during maintenance we only pause writes briefly and wait for the last few rows to catch up.',
        translation:
          '[DBA] Tức là lúc bảo trì mình chỉ tạm dừng ghi dữ liệu một chút rồi đợi vài dòng cuối đồng bộ xong là được.',
        hint: 'pause writes, catch up',
      },
      {
        text: 'Once the data matches completely, how will we check that nothing was missed during the move?',
        translation:
          '[Project Lead] Khi dữ liệu khớp rồi thì kiểm tra kiểu gì để chắc chắn không sót dữ liệu nào?',
        hint: 'matches completely, missed',
      },
      {
        text: 'I wrote a check script that compares table row counts and data checks across all main tables.',
        translation:
          '[DBA] Mình viết sẵn script đối chiếu số dòng và kiểm tra toàn vẹn dữ liệu trên tất cả các bảng chính rồi.',
        hint: 'check script, row counts',
      },
      {
        text: 'And what happens if our application servers show unexpected errors right after using the new database?',
        translation:
          '[Project Lead] Còn lỡ các server ứng dụng báo lỗi bất ngờ ngay sau khi trỏ sang database mới thì xử lý sao?',
        hint: 'unexpected errors',
      },
      {
        text: 'We will keep the old database server safe and online in read only mode all weekend.',
        translation:
          '[DBA] Mình vẫn giữ nguyên server database cũ ở chế độ chỉ đọc suốt cuối tuần.',
        hint: 'read only mode',
      },
      {
        text: 'If any important quick test fails within fifteen minutes, we simply point traffic back to the old server.',
        translation:
          '[DBA] Nếu trong 15 phút đầu có bài test nhanh quan trọng nào bị lỗi thì mình trỏ hệ thống quay lại server cũ ngay.',
        hint: 'quick test, point traffic back',
      },
      {
        text: 'Have we checked firewall rules and login passwords so every app server can reach the new host?',
        translation:
          '[Project Lead] Mình đã kiểm tra luật firewall với mật khẩu đăng nhập để tất cả app server kết nối được máy mới chưa?',
        hint: 'login passwords, reach the new host',
      },
      {
        text: 'Yes, we tested network access and login permissions from every production server earlier today.',
        translation:
          '[DBA] Rồi đó, sáng nay bên mình đã test kết nối mạng và quyền đăng nhập từ từng server production luôn.',
        hint: 'network access, login permissions',
      },
      {
        text: 'Also remember to take a fresh full backup right before pausing production writes.',
        translation:
          '[Project Lead] Nhớ tạo thêm một bản backup đầy đủ mới ngay trước khi tạm dừng ghi trên production nhé.',
        hint: 'fresh full backup',
      },
      {
        text: 'It is step two on our guide, and two engineers will double check every command together.',
        translation:
          '[DBA] Bước đó nằm ngay mục số 2 trong tài liệu hướng dẫn rồi, và sẽ có hai kỹ sư cùng kiểm tra chéo từng câu lệnh.',
        hint: 'guide, double check',
      },
      {
        text: 'Everything looks well prepared; let us meet on the team call at ten forty five Saturday night.',
        translation:
          '[Project Lead] Mọi thứ chuẩn bị rất kỹ rồi; hẹn gặp nhau trong cuộc gọi nhóm lúc 10 giờ 45 tối thứ Bảy nhé.',
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
          '[Staff] Alo bộ phận bảo mật ạ, mình lỡ tay bấm vào một đường link hóa đơn lạ trong email rồi.',
        hint: 'made a mistake, strange invoice link',
      },
      {
        text: 'Thank you for calling right away; reporting it fast is the best thing you could do.',
        translation:
          '[Security Ops] Cảm ơn bạn đã gọi báo ngay nhé; báo càng sớm thì xử lý càng an toàn.',
        hint: 'reporting it fast',
      },
      {
        text: 'Tell me calmly what happened after you clicked the link; did a login page ask for your password?',
        translation:
          '[Security Ops] Bạn cứ bình tĩnh kể lại giúp mình sau khi bấm link thì hiện ra gì; có trang đăng nhập nào đòi mật khẩu không?',
        hint: 'calmly, login page',
      },
      {
        text: 'Yes, it looked just like our company portal, so I typed my work email and password before seeing the strange address.',
        translation:
          '[Staff] Có, trang đó nhìn giống hệt cổng nội bộ công ty nên mình lỡ nhập email với mật khẩu xong mới để ý tên miền lạ.',
        hint: 'company portal, strange address',
      },
      {
        text: 'Okay, do not worry; let me check your account login history and active sessions right now.',
        translation:
          '[Security Ops] Ok đừng lo quá nhé; để mình kiểm tra lịch sử đăng nhập và các phiên đang hoạt động của bạn ngay.',
        hint: 'login history, active sessions',
      },
      {
        text: 'I see a login attempt from an unknown city two minutes ago, so we need to lock it down fast.',
        translation:
          '[Security Ops] Mình thấy có lượt đăng nhập từ một thành phố lạ cách đây 2 phút, cần khóa ngay lập tức.',
        hint: 'unknown city, lock it down',
      },
      {
        text: 'First, I am signing out all active sessions on every device and resetting your password right now.',
        translation:
          '[Security Ops] Trước tiên mình đăng xuất toàn bộ thiết bị đang đăng nhập và đặt lại mật khẩu cho bạn ngay bây giờ.',
        hint: 'signing out, active sessions',
      },
      {
        text: 'Did the attacker open any shared files or forward emails from my mailbox?',
        translation:
          '[Staff] Kẻ gian có kịp mở file dùng chung nào hay chuyển tiếp email từ hộp thư của mình không?',
        hint: 'attacker, forward emails, mailbox',
      },
      {
        text: 'Good news, the activity log shows zero file downloads and no hidden forwarding rules were added.',
        translation:
          '[Security Ops] Tin vui là log hoạt động không thấy tải file nào, cũng chưa có luật tự chuyển tiếp thư ẩn nào bị thêm vào.',
        hint: 'activity log, forwarding rules',
      },
      {
        text: 'I am so glad; did the website download any strange file onto my laptop?',
        translation:
          '[Staff] May quá; trang web đó có tự tải file lạ nào về laptop của mình không?',
        hint: 'glad, strange file',
      },
      {
        text: 'Our antivirus scan shows your laptop is clean, though I will run one more quick check.',
        translation:
          '[Security Ops] Phần mềm diệt virus báo máy bạn vẫn sạch, nhưng mình sẽ cho quét nhanh thêm một lượt nữa cho chắc.',
        hint: 'antivirus scan, quick check',
      },
      {
        text: 'Please forward the fake email to our security inbox so we can block that website for the whole company.',
        translation:
          '[Security Ops] Bạn chuyển tiếp email giả đó sang hộp thư bảo mật giúp mình để bên mình chặn trang đó trên toàn công ty nhé.',
        hint: 'fake email, whole company',
      },
      {
        text: 'I am forwarding it now; do I also need to change my password on any other work apps?',
        translation:
          '[Staff] Mình đang chuyển tiếp đây; mình có cần đổi mật khẩu trên ứng dụng công việc nào khác không?',
        hint: 'change my password',
      },
      {
        text: 'Only if you used the same password anywhere else; always keep your work password different from other accounts.',
        translation:
          '[Security Ops] Chỉ cần đổi nếu bạn dùng trùng mật khẩu đó ở chỗ khác thôi; nhớ luôn đặt mật khẩu công việc riêng biệt nhé.',
        hint: 'same password, different',
      },
      {
        text: 'Next, let us turn on two factor login on your phone so a stolen password alone cannot sign in.',
        translation:
          '[Security Ops] Tiếp theo mình bật đăng nhập hai bước trên điện thoại để lỡ có lộ mật khẩu cũng không ai vào được.',
        hint: 'two factor login, stolen password',
      },
      {
        text: 'I just scanned the setup code in my phone app and typed in the six digit code.',
        translation:
          '[Staff] Mình vừa quét mã trên ứng dụng điện thoại rồi nhập mã 6 chữ số xong rồi.',
        hint: 'setup code, six digit code',
      },
      {
        text: 'Your account is safe again, and I have already blocked the sender and removed the email from other inboxes.',
        translation:
          '[Security Ops] Tài khoản bạn an toàn lại rồi đấy, mình cũng đã chặn người gửi và gỡ email đó khỏi hộp thư của mọi người.',
        hint: 'blocked the sender, removed',
      },
      {
        text: 'Thanks so much for your help; I will always check the sender address carefully from now on.',
        translation:
          '[Staff] Cảm ơn bạn hỗ trợ nhiều nhé; từ giờ mình sẽ luôn xem kỹ địa chỉ người gửi trước khi bấm.',
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
          '[Shift Operator] Chào buổi sáng, mình xem báo cáo hằng ngày thấy backup của file server bị lỗi ba đêm liên tiếp rồi.',
        hint: 'daily report, three nights in a row',
      },
      {
        text: 'Three nights? Why did the monitoring board only show a yellow warning instead of a red alert?',
        translation:
          '[Backup Eng] Ba đêm liền á? Sao màn hình giám sát chỉ hiện cảnh báo vàng chứ không báo đỏ vậy?',
        hint: 'monitoring board, instead of',
      },
      {
        text: 'The alert rule only turns red after five failures, which feels much too late for important company files.',
        translation:
          '[Shift Operator] Luật cảnh báo đang để lỗi 5 lần mới báo đỏ, như vậy trễ quá với dữ liệu quan trọng của công ty.',
        hint: 'too late, company files',
      },
      {
        text: 'You are completely right; let us fix the broken backup first and change that alert rule right after.',
        translation:
          '[Backup Eng] Đúng thật; mình sửa xong backup bị lỗi trước rồi chỉnh lại luật cảnh báo ngay sau đó nhé.',
        hint: 'broken backup, alert rule',
      },
      {
        text: 'I opened last night’s backup log, and the job failed right at the start with an access denied message.',
        translation:
          '[Shift Operator] Mình mở log backup đêm qua thì thấy vừa chạy đã lỗi ngay với thông báo bị từ chối truy cập.',
        hint: 'access denied',
      },
      {
        text: 'Access denied usually means our cloud storage key expired or someone changed folder permissions.',
        translation:
          '[Backup Eng] Báo từ chối truy cập thì thường là khóa lưu trữ cloud hết hạn hoặc có ai đổi quyền thư mục rồi.',
        hint: 'cloud storage key, permissions',
      },
      {
        text: 'Let me check the service account page; yes, the backup access key expired on Monday evening.',
        translation:
          '[Backup Eng] Để mình xem trang tài khoản dịch vụ; đúng rồi, khóa backup vừa hết hạn tối thứ Hai.',
        hint: 'service account, access key',
      },
      {
        text: 'Are all our local backup copies from the past week still safe on the office storage server?',
        translation:
          '[Shift Operator] Mấy bản backup nội bộ tuần qua trên server lưu trữ ở văn phòng vẫn ổn hết chứ?',
        hint: 'local backup copies, storage server',
      },
      {
        text: 'Yes, local backups worked fine; only the cloud backup upload failed because of the expired key.',
        translation:
          '[Backup Eng] Ừ, backup nội bộ vẫn chạy ngon; chỉ có bước đẩy lên cloud bị lỗi do khóa hết hạn thôi.',
        hint: 'cloud backup upload',
      },
      {
        text: 'I am creating a new service key now and updating the saved key inside our backup tool.',
        translation:
          '[Backup Eng] Mình đang tạo khóa mới rồi cập nhật lại vào trong công cụ backup đây.',
        hint: 'saved key, backup tool',
      },
      {
        text: 'Should we wait until midnight to see if it works, or run a manual backup right now?',
        translation:
          '[Shift Operator] Mình đợi tới nửa đêm xem có chạy không, hay chạy backup thủ công ngay bây giờ luôn?',
        hint: 'manual backup',
      },
      {
        text: 'Never wait until midnight after three failures; let us start a quick upload of new files right away.',
        translation:
          '[Backup Eng] Lỗi ba hôm rồi thì đừng đợi nửa đêm; mình chạy đồng bộ nhanh các file mới lên ngay đi.',
        hint: 'quick upload, right away',
      },
      {
        text: 'The upload started cleanly and is sending files at forty megabytes per second.',
        translation:
          '[Shift Operator] Quá trình tải lên chạy êm rồi, tốc độ đang đạt 40 MB mỗi giây.',
        hint: 'sending files, per second',
      },
      {
        text: 'Since it only uploads changed files, it should finish within five minutes.',
        translation:
          '[Backup Eng] Vì chỉ đẩy những file có thay đổi nên chắc tầm 5 phút là xong thôi.',
        hint: 'changed files, within five minutes',
      },
      {
        text: 'It just finished with zero errors! Let us also restore one test folder to staging to be sure.',
        translation:
          '[Shift Operator] Chạy xong không một lỗi nào luôn! Mình khôi phục thử một thư mục lên staging kiểm tra cho chắc nhé.',
        hint: 'to be sure, staging',
      },
      {
        text: 'The test restore worked and every document opened with no errors.',
        translation:
          '[Backup Eng] Khôi phục thử thành công rồi, mở tài liệu nào cũng lên bình thường không lỗi.',
        hint: 'test restore, no errors',
      },
      {
        text: 'Now I am updating the alert rule so even a single missed backup sends a red ticket the next morning.',
        translation:
          '[Backup Eng] Giờ mình chỉnh lại luật cảnh báo để chỉ cần lỗi một lần là sáng hôm sau tự tạo ticket khẩn cấp ngay.',
        hint: 'alert rule, missed backup',
      },
      {
        text: 'Thanks a lot, I will add a calendar reminder to change the storage key before it expires in three months.',
        translation:
          '[Shift Operator] Cảm ơn nhiều nhé, để mình đặt lịch nhắc đổi khóa lưu trữ trước khi hết hạn trong ba tháng tới.',
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
          '[App Support] Chào bạn, người dùng app di động đang báo màn hình cứ xoay mãi rồi bị lỗi timeout lúc thanh toán đơn hàng.',
        hint: 'loading spinners, timeout errors',
      },
      {
        text: 'Let me open the API gateway dashboard; yes, the error rate on the payment endpoint just rose to twelve percent.',
        translation:
          '[SRE] Để mình mở dashboard API gateway xem; đúng rồi, tỷ lệ lỗi ở API thanh toán vừa tăng lên 12%.',
        hint: 'API gateway, error rate, endpoint',
      },
      {
        text: 'Are other mobile features like browsing products or viewing order history still working fast?',
        translation:
          '[SRE] Các tính năng khác trên app như xem sản phẩm hay lịch sử đơn hàng vẫn chạy nhanh chứ?',
        hint: 'order history, browsing products',
      },
      {
        text: 'Yes, everything else responds in under half a second; only the checkout payment call is hanging.',
        translation:
          '[App Support] Ừ, mấy chỗ khác phản hồi chưa tới nửa giây; chỉ riêng bước gọi thanh toán là bị treo thôi.',
        hint: 'responds, hanging',
      },
      {
        text: 'Let us check the request logs to see whether the delay is inside our own code or an outside partner.',
        translation:
          '[SRE] Mình xem log request để biết độ trễ nằm ở code bên mình hay do phía đối tác bên ngoài nhé.',
        hint: 'request logs, outside partner',
      },
      {
        text: 'Look at the time details: our internal service finishes in twenty milliseconds, then waits thirty seconds for the bank API.',
        translation:
          '[SRE] Nhìn chi tiết thời gian này: hệ thống bên mình xử lý xong trong 20 mili giây, xong phải đợi tới 30 giây từ API ngân hàng.',
        hint: 'time details, internal service',
      },
      {
        text: 'Thirty seconds is way too long! Let me check the payment partner’s public status page.',
        translation:
          '[App Support] 30 giây thì lâu quá rồi! Để mình mở trang trạng thái của đối tác thanh toán kiểm tra xem.',
        hint: 'payment partner, public status page',
      },
      {
        text: 'They just posted an incident notice saying their European payment gateway is running slowly.',
        translation:
          '[App Support] Họ vừa đăng thông báo sự cố là cổng thanh toán khu vực châu Âu của họ đang bị chậm.',
        hint: 'incident notice, running slowly',
      },
      {
        text: 'Because our timeout was set to thirty seconds, waiting calls are keeping all our payment workers busy.',
        translation:
          '[SRE] Do bên mình để timeout tới 30 giây nên các request chờ phản hồi đang chiếm kín hết luồng xử lý thanh toán.',
        hint: 'keeping busy, payment workers',
      },
      {
        text: 'Can we lower the timeout to six seconds and show a polite retry message to users?',
        translation:
          '[App Support] Mình hạ timeout xuống 6 giây rồi hiện thông báo mời khách thử lại nhẹ nhàng được không?',
        hint: 'lower the timeout, retry message',
      },
      {
        text: 'Even better, we also have a backup payment service set up and ready for traffic.',
        translation:
          '[SRE] Còn cách tốt hơn nữa, bên mình có cấu hình sẵn một cổng thanh toán dự phòng đang sẵn sàng nhận tải.',
        hint: 'backup payment service, ready',
      },
      {
        text: 'Let us move fifty percent of checkout traffic to the backup service first and watch the success rate.',
        translation:
          '[SRE] Mình chuyển trước 50% lưu lượng thanh toán sang cổng dự phòng rồi theo dõi tỷ lệ thành công nhé.',
        hint: 'move traffic, success rate',
      },
      {
        text: 'Payments on the backup gateway are finishing in less than one second with zero timeouts.',
        translation:
          '[App Support] Giao dịch qua cổng dự phòng xử lý chưa tới 1 giây và không bị lỗi timeout nào luôn.',
        hint: 'finishing, zero timeouts',
      },
      {
        text: 'Great, I am moving one hundred percent of payment traffic over until the main partner recovers.',
        translation:
          '[SRE] Tuyệt, mình chuyển toàn bộ 100% lưu lượng thanh toán sang bên đó cho tới khi đối tác chính hồi phục.',
        hint: 'main partner, recovers',
      },
      {
        text: 'I also lowered the gateway timeout to eight seconds and added a safe limit on automatic retries.',
        translation:
          '[SRE] Mình cũng hạ timeout của gateway xuống 8 giây và đặt thêm giới hạn an toàn cho các lần tự động thử lại.',
        hint: 'automatic retries',
      },
      {
        text: 'Support tickets already stopped coming in, and payment success is back to its normal level.',
        translation:
          '[App Support] Ticket báo lỗi ngừng đổ về rồi, tỷ lệ thanh toán thành công cũng quay về mức bình thường.',
        hint: 'payment success, normal level',
      },
      {
        text: 'Let us keep an eye on the partner status page before switching traffic back tomorrow morning.',
        translation:
          '[SRE] Mình cứ theo dõi trang trạng thái của họ trước khi chuyển lưu lượng quay lại vào sáng mai nhé.',
        hint: 'keep an eye on, switching back',
      },
      {
        text: 'Agreed; having a tested backup gateway really saved our afternoon today.',
        translation:
          '[App Support] Đồng ý luôn; có sẵn cổng dự phòng đã test kỹ đúng là cứu nguyên buổi chiều nay.',
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
          '[Ops Manager] Chào mọi người đến buổi họp tổng kết vận hành thứ Sáu; mình cùng nhìn lại hai sự cố đã xử lý tuần này nhé.',
        hint: 'operations review, handled',
      },
      {
        text: 'Total uptime stayed above ninety nine percent, though Tuesday’s night alert took longer than expected.',
        translation:
          '[SysAdmin] Tổng thời gian hoạt động vẫn trên 99%, chỉ có cảnh báo tối thứ Ba xử lý hơi lâu hơn dự kiến.',
        hint: 'total uptime, longer than expected',
      },
      {
        text: 'What slowed the response down on Tuesday when the queue server stopped processing jobs?',
        translation:
          '[Ops Manager] Hôm thứ Ba lúc server hàng đợi ngừng chạy tác vụ thì điều gì làm mình xử lý chậm vậy?',
        hint: 'slowed down, processing jobs',
      },
      {
        text: 'First, our monitoring chat received nearly forty small warnings that night, so the real problem was easy to miss.',
        translation:
          '[SysAdmin] Thứ nhất, đêm đó kênh chat giám sát nổ gần 40 cảnh báo lặt vặt nên rất dễ bỏ sót lỗi thật.',
        hint: 'small warnings, easy to miss',
      },
      {
        text: 'Second, the restart steps in our wiki were old after last month’s server upgrade.',
        translation:
          '[SysAdmin] Thứ hai, các bước khởi động lại trên wiki đã cũ từ sau đợt nâng cấp server tháng trước.',
        hint: 'restart steps, server upgrade',
      },
      {
        text: 'That is very clear feedback; noisy alerts tire out the on call team and slow down real fixes.',
        translation:
          '[Ops Manager] Góp ý rất rõ ràng; cảnh báo nhiễu làm anh em trực ca bị mệt và chậm xử lý sự cố thật.',
        hint: 'noisy alerts, tire out',
      },
      {
        text: 'Which of those forty small warnings can we safely turn off or put into a daily summary email?',
        translation:
          '[Ops Manager] Trong 40 cảnh báo nhỏ đó, những cái nào mình có thể tắt bớt hoặc gom vào email tổng hợp hằng ngày?',
        hint: 'turn off, daily summary',
      },
      {
        text: 'Short CPU jumps that last under thirty seconds never need to wake someone up at three in the morning.',
        translation:
          '[SysAdmin] Mấy đợt CPU tăng vọt dưới 30 giây thì không bao giờ cần dựng anh em dậy lúc 3 giờ sáng cả.',
        hint: 'CPU jumps, wake someone up',
      },
      {
        text: 'Agreed; let us wait until high CPU stays above eighty five percent for five minutes before calling the on call engineer.',
        translation:
          '[Ops Manager] Nhất trí; mình chỉnh thành CPU phải giữ trên 85% liên tục 5 phút thì mới gọi kỹ sư trực.',
        hint: 'on call engineer, stays above',
      },
      {
        text: 'What about updating our incident guides so new shift engineers can follow them easily?',
        translation:
          '[Ops Manager] Còn việc cập nhật tài liệu xử lý sự cố để các bạn trực ca mới dễ làm theo thì sao?',
        hint: 'shift engineers, easily',
      },
      {
        text: 'I already rewrote the queue server guide with exact commands, expected results, and clear rollback steps.',
        translation:
          '[SysAdmin] Mình đã viết lại hướng dẫn cho server hàng đợi rồi, có sẵn câu lệnh cụ thể, kết quả mong đợi và các bước quay lui rõ ràng.',
        hint: 'exact commands, expected results',
      },
      {
        text: 'Can we ask one of our newer engineers to test that guide on staging next Tuesday?',
        translation:
          '[Ops Manager] Thứ Ba tới mình nhờ một kỹ sư mới chạy thử theo tài liệu đó trên staging xem sao nhé?',
        hint: 'newer engineers, test on staging',
      },
      {
        text: 'Great idea; if a new team member can follow every step smoothly, we know the document is really clear.',
        translation:
          '[SysAdmin] Ý hay đấy; nếu thành viên mới làm trôi chảy từng bước thì chứng tỏ tài liệu thực sự dễ hiểu.',
        hint: 'really clear, follow every step',
      },
      {
        text: 'Let us also link each monitoring alert directly to its matching guide page.',
        translation:
          '[Ops Manager] Mình gắn luôn đường link tài liệu hướng dẫn tương ứng vào từng cảnh báo giám sát nhé.',
        hint: 'link directly, matching guide',
      },
      {
        text: 'That saves important minutes during an urgent phone call because nobody has to search through old folders.',
        translation:
          '[SysAdmin] Cách đó tiết kiệm được khối thời gian quý giá lúc xử lý khẩn cấp vì không phải lục tìm trong đống thư mục cũ.',
        hint: 'important minutes, urgent phone call',
      },
      {
        text: 'Before we finish, is there any maintenance or risky release planned for next week?',
        translation:
          '[Ops Manager] Trước khi kết thúc buổi họp, tuần tới có lịch bảo trì hay đợt cập nhật nào rủi ro không?',
        hint: 'maintenance, planned',
      },
      {
        text: 'Only a normal security update on Wednesday evening, and backups are already checked and ready.',
        translation:
          '[SysAdmin] Chỉ có đợt cập nhật bảo mật định kỳ tối thứ Tư thôi, backup cũng đã kiểm tra sẵn sàng hết rồi.',
        hint: 'security update, checked and ready',
      },
      {
        text: 'Great work everyone; fewer noisy alerts and clearer guides will make next week much calmer.',
        translation:
          '[Ops Manager] Cả team làm tốt lắm; bớt cảnh báo nhiễu với có tài liệu rõ ràng hơn sẽ giúp tuần tới nhẹ nhàng hơn nhiều.',
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
