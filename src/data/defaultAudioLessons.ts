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
 * Legacy preset IDs retired in favor of A2-B1 IT System Operations conversations.
 * Automatically purged from LocalStorage & Cloud D1 during app startup/sync.
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
        translation:
          '[Ca sáng] Chào buổi sáng Ben, ca trực đêm ở phòng máy chủ thế nào?',
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
        translation:
          '[Ca sáng] Đêm qua màn hình giám sát có báo cảnh báo đỏ nào không?',
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
        translation:
          '[Ca sáng] Nguyên nhân cảnh báo là gì, cậu có cần khởi động lại máy không?',
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
        translation:
          '[Ca sáng] Tốt quá, còn phiếu hỗ trợ nào đang mở chờ ca sáng xử lý không?',
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
        translation:
          '[Ca sáng] Cảm ơn bàn giao rõ ràng nhé Ben; về nhà nghỉ ngơi cho khỏe đi.',
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
        translation:
          '[Helpdesk] Đừng lo, tôi có thể mở khóa giúp bạn chỉ trong vài phút.',
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
    id: 'lesson-audio-itops-a2-11',
    videoId: 'audio-itops-a2-11',
    title: 'A2-B1 | 11. Moving Traffic to a Healthy Server (IT Ops)',
    description:
      'A2-B1 operations call troubleshooting a failing backend server, checking health probes, and routing traffic to a healthy zone (~1 min, A2-B1, UK English).',
    voiceAccent: 'en-GB',
    level: 'Beginner',
    items: [
      {
        text: 'David, some users in Europe are seeing random error pages after our server switch.',
        translation:
          '[NetOps] David ơi, một số người dùng ở châu Âu đang thấy trang lỗi ngẫu nhiên sau khi ta chuyển máy chủ.',
        hint: 'random error pages, server switch',
      },
      {
        text: 'Let me check the load balancer; two backend servers are failing their health checks.',
        translation:
          '[Cloud] Để tôi kiểm tra bộ cân bằng tải; hai máy chủ backend đang trượt kiểm tra sức khỏe.',
        hint: 'load balancer, health checks',
      },
      {
        text: 'Why did the system keep sending visitors to servers that are not healthy?',
        translation:
          '[NetOps] Tại sao hệ thống vẫn tiếp tục gửi khách truy cập tới các máy chủ không khỏe?',
        hint: 'sending visitors, healthy',
      },
      {
        text: 'The check timer was set too slow, so it waited three minutes before removing them.',
        translation:
          '[Cloud] Bộ hẹn giờ kiểm tra đặt quá chậm, nên nó chờ tới ba phút mới gỡ chúng ra.',
        hint: 'check timer, removing',
      },
      {
        text: 'I just made the health check faster and moved all traffic to our healthy backup zone.',
        translation:
          '[Cloud] Tôi vừa chỉnh kiểm tra sức khỏe nhanh hơn và chuyển toàn bộ lưu lượng sang vùng dự phòng ổn định.',
        hint: 'faster, backup zone',
      },
      {
        text: 'One office still sees the old server address; is their network saving old DNS data?',
        translation:
          '[NetOps] Một văn phòng vẫn thấy địa chỉ máy chủ cũ; có phải mạng của họ đang lưu dữ liệu DNS cũ không?',
        hint: 'old server address, DNS data',
      },
      {
        text: 'Yes, our DNS setting kept the old address for an hour before updating.',
        translation:
          '[Cloud] Đúng rồi, cài đặt DNS của mình giữ địa chỉ cũ tới một tiếng mới cập nhật.',
        hint: 'kept, updating',
      },
      {
        text: 'After everything settles, let us change that DNS timer to one minute for faster switches.',
        translation:
          '[NetOps] Sau khi mọi thứ ổn định, hãy đổi bộ hẹn giờ DNS đó thành một phút để lần sau chuyển nhanh hơn nhé.',
        hint: 'settles, one minute, faster switches',
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
    id: 'lesson-audio-itops-a2-13',
    videoId: 'audio-itops-a2-13',
    title: 'A2-B1 | 13. Testing a Backup Restore Before Audit (IT Ops)',
    description:
      'Clear operations review checking weekly and hourly backups, running a test restore in staging, and protecting offsite copies (~1 min, A2-B1, UK English).',
    voiceAccent: 'en-GB',
    level: 'Beginner',
    items: [
      {
        text: 'Good morning Tom, our yearly system check starts next week; are our backup reports ready?',
        translation:
          '[Ops Manager] Chào buổi sáng Tom, đợt kiểm tra hệ thống hằng năm bắt đầu tuần tới; báo cáo sao lưu đã sẵn sàng chưa?',
        hint: 'yearly check, backup reports',
      },
      {
        text: 'Yes, we save a full copy every Sunday and smaller updates every single hour.',
        translation:
          '[Backup Admin] Rồi ạ, ta lưu một bản sao đầy đủ mỗi Chủ nhật và các bản cập nhật nhỏ mỗi giờ.',
        hint: 'full copy, every hour',
      },
      {
        text: 'That is great, so we lose less than one hour of data if a server fails.',
        translation:
          '[Ops Manager] Tốt lắm, vậy ta chỉ mất dưới một giờ dữ liệu nếu một máy chủ gặp sự cố.',
        hint: 'less than, server fails',
      },
      {
        text: 'We also tested a full restore on our test server yesterday and checked all customer records.',
        translation:
          '[Backup Admin] Hôm qua tụi em cũng đã thử khôi phục toàn bộ trên máy chủ thử nghiệm và kiểm tra mọi hồ sơ khách hàng.',
        hint: 'full restore, test server, records',
      },
      {
        text: 'How long did the whole database restore take from start to finish?',
        translation:
          '[Ops Manager] Toàn bộ quá trình khôi phục cơ sở dữ liệu mất bao lâu từ đầu đến cuối?',
        hint: 'from start to finish',
      },
      {
        text: 'It took thirty five minutes, which is much faster than our two hour target.',
        translation:
          '[Backup Admin] Mất 35 phút, nhanh hơn nhiều so với mục tiêu hai giờ của mình.',
        hint: 'thirty five minutes, target',
      },
      {
        text: 'Are our extra backup copies locked in cloud storage so hackers cannot delete them?',
        translation:
          '[Ops Manager] Các bản sao lưu dự phòng có được khóa trên lưu trữ đám mây để tin tặc không xóa được không?',
        hint: 'locked, cloud storage, hackers',
      },
      {
        text: 'Yes, cloud lock keeps every copy safe for ninety days, and nobody can change or erase it.',
        translation:
          '[Backup Admin] Có ạ, khóa đám mây giữ an toàn mọi bản sao trong 90 ngày, không ai có thể sửa hay xóa được.',
        hint: 'ninety days, change or erase',
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
  {
    id: 'lesson-audio-itops-a2-15',
    videoId: 'audio-itops-a2-15',
    title: 'A2-B1 | 15. Office VPN Connection Problem for Remote Staff (IT Ops)',
    description:
      'Everyday IT Operations support call troubleshooting a company VPN outage for remote employees working from home (~1 min, A2-B1, UK English).',
    voiceAccent: 'en-GB',
    level: 'Beginner',
    items: [
      {
        text: 'Hi Alex, five staff members working from home say they cannot connect to the office VPN.',
        translation:
          '[Helpdesk] Chào Alex, năm nhân viên làm việc tại nhà báo họ không thể kết nối VPN công ty.',
        hint: 'working from home, office VPN',
      },
      {
        text: 'Do they see a wrong password message, or does the connection just time out?',
        translation:
          '[NetOps] Họ thấy thông báo sai mật khẩu, hay kết nối chỉ bị hết thời gian chờ?',
        hint: 'wrong password, time out',
      },
      {
        text: 'It keeps trying to connect for thirty seconds, then shows server not responding.',
        translation:
          '[Helpdesk] Nó cứ thử kết nối trong ba mươi giây, rồi báo máy chủ không phản hồi.',
        hint: 'thirty seconds, not responding',
      },
      {
        text: 'Let me check the VPN gateway; oh, the service reached its maximum user limit today.',
        translation:
          '[NetOps] Để tôi kiểm tra cổng VPN; ồ, dịch vụ đã chạm giới hạn số người dùng tối đa hôm nay.',
        hint: 'VPN gateway, user limit',
      },
      {
        text: 'Why are there so many connections when only forty people work remotely?',
        translation:
          '[Helpdesk] Tại sao lại có nhiều kết nối thế khi chỉ có bốn mươi người làm việc từ xa?',
        hint: 'connections, remotely',
      },
      {
        text: 'Many old sessions stayed open overnight because people did not log out after work.',
        translation:
          '[NetOps] Nhiều phiên cũ vẫn mở qua đêm vì mọi người không đăng xuất sau giờ làm.',
        hint: 'stayed open, overnight, log out',
      },
      {
        text: 'I will clear inactive sessions older than four hours and add an automatic timeout.',
        translation:
          '[NetOps] Tôi sẽ dọn các phiên không hoạt động quá bốn giờ và thêm chế độ tự ngắt kết nối.',
        hint: 'inactive sessions, automatic timeout',
      },
      {
        text: 'Awesome, two remote users just got connected, and I will update the rest in chat.',
        translation:
          '[Helpdesk] Tuyệt quá, hai nhân viên từ xa vừa kết nối được rồi, để tôi báo cho những người còn lại trong nhóm chat.',
        hint: 'connected, update the rest',
      },
    ],
  },
  {
    id: 'lesson-audio-itops-a2-16',
    videoId: 'audio-itops-a2-16',
    title: 'A2-B1 | 16. Reviewing Yesterday’s Outage Together (IT Ops)',
    description:
      'Friendly A2-B1 post-incident team review discussing what happened during an outage, cleaning noisy alerts, and updating the checklist (~1 min, A2-B1, UK English).',
    voiceAccent: 'en-GB',
    level: 'Beginner',
    items: [
      {
        text: 'Thanks everyone for joining our short review of Tuesday’s twenty minute website outage.',
        translation:
          '[Team Lead] Cảm ơn mọi người đã tham gia buổi rà soát ngắn về sự cố mất mạng trang web hai mươi phút hôm thứ Ba.',
        hint: 'short review, website outage',
      },
      {
        text: 'Remember, we are here to make our system stronger, not to blame any team member.',
        translation:
          '[Team Lead] Hãy nhớ ta ở đây để làm hệ thống vững vàng hơn, chứ không phải đổ lỗi cho thành viên nào.',
        hint: 'stronger, blame',
      },
      {
        text: 'Our timeline shows customers saw slow pages for twenty minutes before the backup server took over.',
        translation:
          '[Ops Eng] Dòng thời gian cho thấy khách thấy trang chậm trong hai mươi phút trước khi máy chủ dự phòng tiếp quản.',
        hint: 'timeline, took over',
      },
      {
        text: 'Why did it take our on-call team ten minutes just to notice the first critical alert?',
        translation:
          '[Team Lead] Tại sao nhóm trực ứng cứu lại mất tới mười phút mới nhận ra cảnh báo khẩn cấp đầu tiên?',
        hint: 'on-call team, notice, critical alert',
      },
      {
        text: 'Our chat channel had too many small test warnings, so the real red alert got buried.',
        translation:
          '[Ops Eng] Kênh chat của ta có quá nhiều cảnh báo thử nghiệm nhỏ, nên cảnh báo đỏ thật bị chìm mất.',
        hint: 'chat channel, warnings, buried',
      },
      {
        text: 'Let us turn off those noisy low warnings and keep the alert channel clean.',
        translation:
          '[Team Lead] Hãy tắt các cảnh báo mức thấp ồn ào đó đi và giữ kênh cảnh báo thật gọn gàng.',
        hint: 'noisy, alert channel',
      },
      {
        text: 'Should we also update our step by step guide so new engineers know who to call first?',
        translation:
          '[Ops Eng] Ta có nên cập nhật sổ tay từng bước để kỹ sư mới biết cần gọi ai trước không?',
        hint: 'step by step guide, call first',
      },
      {
        text: 'Yes, I created clear tasks with owners and dates so we finish every fix this week.',
        translation:
          '[Team Lead] Có, tôi đã tạo các đầu việc rõ ràng có người phụ trách và hạn chót để ta sửa xong hết trong tuần này.',
        hint: 'clear tasks, owners, dates',
      },
    ],
  },
]

export const DEFAULT_A2_B1_AUDIO_LESSONS: Lesson[] = RAW_IT_OPS_A2_B1_SPECS.map(buildLesson)
export const DEFAULT_IT_OPS_B1_B2_AUDIO_LESSONS: Lesson[] = []
export const DEFAULT_B1_B2_AUDIO_LESSONS: Lesson[] = [...DEFAULT_A2_B1_AUDIO_LESSONS]
export const DEFAULT_IT_OPS_AUDIO_LESSONS = DEFAULT_A2_B1_AUDIO_LESSONS
