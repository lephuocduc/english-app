import type { Lesson, SentenceSegment, VoiceAccent } from '../types'
import { estimateSentenceDuration } from '../lib/audio/textToLesson'

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
 * Legacy preset IDs retired in favor of IT System Operations conversations.
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
])

function buildLesson(spec: RawAudioLessonSpec): Lesson {
  let cursor = 0
  const sentences: SentenceSegment[] = spec.items.map((item, idx) => {
    const duration = estimateSentenceDuration(item.text)
    const startTime = Math.round(cursor * 10) / 10
    const endTime = Math.round((cursor + duration) * 10) / 10
    cursor = endTime
    return {
      id: `${spec.videoId}-seg-${idx + 1}`,
      startTime,
      endTime,
      text: item.text,
      translation: item.translation,
      hint: item.hint,
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

const RAW_IT_OPS_SPECS: RawAudioLessonSpec[] = [
  {
    id: 'lesson-audio-itops-01',
    videoId: 'audio-itops-01',
    title: '01. High CPU Alert & Memory Leak Triage (IT Ops)',
    description:
      'On-call bridge call between a NOC analyst and an SRE triaging a production CPU spike, heap dump capture, and safe rollback (~1 min, B1-B2).',
    voiceAccent: 'en-GB',
    level: 'Intermediate',
    items: [
      {
        text: 'Hi Mark, sorry to wake you, but production web server three just crossed ninety percent CPU.',
        translation:
          '[NOC] Chào Mark, xin lỗi đã đánh thức anh, nhưng máy chủ web production số ba vừa vượt ngưỡng 90% CPU.',
        hint: 'production, crossed, ninety percent CPU',
      },
      {
        text: 'I am logging into the monitoring dashboard now; are customer requests starting to time out?',
        translation:
          '[SRE] Tôi đang đăng nhập bảng điều khiển giám sát; yêu cầu của khách hàng có bắt đầu bị quá thời gian chờ không?',
        hint: 'monitoring dashboard, time out',
      },
      {
        text: 'Yes, average latency jumped above two seconds, and memory usage keeps climbing without dropping.',
        translation:
          '[NOC] Có, độ trễ trung bình nhảy vọt lên trên hai giây và mức dùng bộ nhớ cứ tăng liên tục không giảm.',
        hint: 'average latency, memory usage, climbing',
      },
      {
        text: 'That looks like a classic memory leak triggering heavy garbage collection cycles.',
        translation:
          '[SRE] Nghe giống lỗi rò rỉ bộ nhớ kinh điển gây ra các chu kỳ thu gom rác nặng nề.',
        hint: 'memory leak, garbage collection cycles',
      },
      {
        text: 'Should I restart the application service immediately to bring the CPU back down?',
        translation:
          '[NOC] Tôi có nên khởi động lại dịch vụ ứng dụng ngay để hạ CPU xuống không?',
        hint: 'restart, application service, immediately',
      },
      {
        text: 'Wait one minute; drain that server from the load balancer first so we preserve a heap dump.',
        translation:
          '[SRE] Khoan một phút; hãy rút lưu lượng khỏi máy chủ đó ở bộ cân bằng tải trước để giữ lại bản chụp bộ nhớ heap.',
        hint: 'drain, load balancer, preserve, heap dump',
      },
      {
        text: 'Got it, traffic is drained and the diagnostic snapshot finished writing to storage.',
        translation:
          '[NOC] Rõ rồi, lưu lượng đã được chuyển hướng và bản chụp chẩn đoán đã ghi xong vào bộ lưu trữ.',
        hint: 'diagnostic snapshot, storage',
      },
      {
        text: "Great, now roll back tonight's release to the previous stable build while I analyze the dump.",
        translation:
          '[SRE] Tuyệt, giờ hãy hoàn tác bản phát hành tối nay về bản dựng ổn định trước đó trong lúc tôi phân tích file dump.',
        hint: 'roll back, release, stable build, analyze',
      },
      {
        text: 'Rollback is complete, CPU dropped to twenty percent, and response times are healthy again.',
        translation:
          '[NOC] Hoàn tác xong rồi, CPU đã giảm xuống 20% và thời gian phản hồi đã ổn định trở lại.',
        hint: 'rollback, response times, healthy',
      },
    ],
  },
  {
    id: 'lesson-audio-itops-02',
    videoId: 'audio-itops-02',
    title: '02. Expired SSL Certificate Outage (IT Ops)',
    description:
      'Urgent call between a Helpdesk lead and an Infrastructure engineer fixing an expired TLS certificate on the API gateway (~1 min, B1-B2).',
    voiceAccent: 'en-GB',
    level: 'Intermediate',
    items: [
      {
        text: 'Hello Sarah, customers are calling because browsers show a security warning on our main portal.',
        translation:
          '[Helpdesk] Chào Sarah, khách hàng đang gọi báo trình duyệt hiện cảnh báo bảo mật trên cổng thông tin chính.',
        hint: 'security warning, main portal',
      },
      {
        text: 'Let me inspect the TLS handshake; oh no, the public SSL certificate expired ten minutes ago.',
        translation:
          '[Infra] Để tôi kiểm tra quá trình bắt tay TLS; ôi không, chứng chỉ SSL công khai vừa hết hạn mười phút trước.',
        hint: 'inspect, TLS handshake, SSL certificate, expired',
      },
      {
        text: 'I thought our automation script renewed every certificate automatically before expiration.',
        translation:
          '[Helpdesk] Tôi tưởng kịch bản tự động hóa của chúng ta gia hạn mọi chứng chỉ trước khi hết hạn chứ.',
        hint: 'automation script, renewed, expiration',
      },
      {
        text: 'A recent firewall change blocked the validation challenge, so the renewal job silently failed.',
        translation:
          '[Infra] Một thay đổi tường lửa gần đây đã chặn bước xác thực, nên tác vụ gia hạn bị lỗi âm thầm.',
        hint: 'firewall, validation challenge, silently failed',
      },
      {
        text: 'How fast can we restore encrypted traffic without disconnecting active mobile users?',
        translation:
          '[Helpdesk] Chúng ta có thể khôi phục lưu lượng mã hóa nhanh cỡ nào mà không ngắt kết nối người dùng di động đang hoạt động?',
        hint: 'restore, encrypted traffic, disconnecting',
      },
      {
        text: 'I am uploading the renewed certificate and full intermediate chain to the reverse proxy right now.',
        translation:
          '[Infra] Tôi đang tải chứng chỉ mới gia hạn cùng chuỗi chứng chỉ trung gian đầy đủ lên reverse proxy ngay đây.',
        hint: 'intermediate chain, reverse proxy',
      },
      {
        text: 'Next, I will reload the web server gracefully so existing connections finish cleanly.',
        translation:
          '[Infra] Tiếp theo, tôi sẽ nạp lại cấu hình máy chủ web một cách êm ái để các kết nối hiện có hoàn tất trọn vẹn.',
        hint: 'reload gracefully, existing connections',
      },
      {
        text: 'The portal is green again, and let us add a thirty day expiry alert immediately.',
        translation:
          '[Helpdesk] Cổng thông tin đã xanh trở lại, và chúng ta hãy thêm ngay cảnh báo hết hạn trước 30 ngày nhé.',
        hint: 'expiry alert, immediately',
      },
    ],
  },
  {
    id: 'lesson-audio-itops-03',
    videoId: 'audio-itops-03',
    title: '03. Root Disk Full & Log Rotation Fix (IT Ops)',
    description:
      'Night-shift Linux troubleshooting call resolving a 100% full root partition, open file handles, and automated log rotation (~1 min, B1-B2).',
    voiceAccent: 'en-GB',
    level: 'Intermediate',
    items: [
      {
        text: 'Hey Kevin, our billing database just stopped accepting writes and triggered a critical disk alert.',
        translation:
          '[Monitoring] Chào Kevin, cơ sở dữ liệu thanh toán vừa ngừng nhận dữ liệu ghi và phát cảnh báo đầy ổ đĩa nghiêm trọng.',
        hint: 'accepting writes, critical disk alert',
      },
      {
        text: 'I checked disk usage, and the root partition reached one hundred percent capacity.',
        translation:
          '[SysAdmin] Tôi vừa kiểm tra dung lượng đĩa, phân vùng root đã chạm ngưỡng 100% sức chứa.',
        hint: 'disk usage, root partition, capacity',
      },
      {
        text: 'Did the database grow unexpectedly, or is something else consuming all that space?',
        translation:
          '[Monitoring] Do cơ sở dữ liệu phình to bất ngờ, hay có thứ gì khác đang chiếm hết dung lượng đó?',
        hint: 'unexpectedly, consuming',
      },
      {
        text: 'Someone left verbose debug logging enabled, creating a single forty gigabyte text file.',
        translation:
          '[SysAdmin] Có ai đó quên tắt chế độ ghi log gỡ lỗi chi tiết, tạo ra một tệp văn bản duy nhất nặng 40 gigabyte.',
        hint: 'verbose debug logging, enabled',
      },
      {
        text: 'Can we just delete that huge log file right away to recover storage?',
        translation:
          '[Monitoring] Chúng ta có thể xóa thẳng tệp log khổng lồ đó ngay lập tức để lấy lại dung lượng không?',
        hint: 'recover storage',
      },
      {
        text: 'Deleting an open file will not free disk space while the running service holds its handle.',
        translation:
          '[SysAdmin] Xóa một tệp đang mở sẽ không giải phóng dung lượng đĩa khi dịch vụ đang chạy vẫn giữ bộ mô tả tệp đó.',
        hint: 'free disk space, holds its handle',
      },
      {
        text: 'Instead, I will truncate the active file safely and disable verbose logging in configuration.',
        translation:
          '[SysAdmin] Thay vào đó, tôi sẽ cắt rỗng tệp đang mở một cách an toàn và tắt log gỡ lỗi chi tiết trong cấu hình.',
        hint: 'truncate, active file, configuration',
      },
      {
        text: 'Database writes resumed immediately; tomorrow let us enforce daily log rotation with automatic compression.',
        translation:
          '[Monitoring] Ghi dữ liệu vào database đã chạy lại ngay; ngày mai chúng ta nhớ áp dụng xoay vòng log hằng ngày kèm nén tự động nhé.',
        hint: 'resumed, enforce, log rotation, compression',
      },
    ],
  },
  {
    id: 'lesson-audio-itops-04',
    videoId: 'audio-itops-04',
    title: '04. Slow Queries & Database Connection Pool (IT Ops)',
    description:
      'Incident call between Application Support and a DBA diagnosing checkout timeouts, full table scans, and read replicas (~1 min, B1-B2).',
    voiceAccent: 'en-GB',
    level: 'Intermediate',
    items: [
      {
        text: 'Hi Priya, checkout requests are timing out and the application logs show connection pool exhaustion.',
        translation:
          '[App Support] Chào Priya, các yêu cầu thanh toán đang bị quá thời gian và log ứng dụng báo cạn kiệt bể kết nối.',
        hint: 'timing out, connection pool exhaustion',
      },
      {
        text: 'I see dozens of queued queries waiting because a heavy analytics report is locking shared resources.',
        translation:
          '[DBA] Tôi thấy hàng chục truy vấn đang xếp hàng chờ vì một báo cáo phân tích nặng đang chiếm dụng tài nguyên dùng chung.',
        hint: 'queued queries, analytics report, shared resources',
      },
      {
        text: 'Why is that report taking almost forty seconds to finish today?',
        translation:
          '[App Support] Tại sao hôm nay báo cáo đó lại mất gần bốn mươi giây mới chạy xong vậy?',
        hint: 'almost forty seconds',
      },
      {
        text: 'The execution plan reveals a full table scan across five million rows without an index.',
        translation:
          '[DBA] Kế hoạch thực thi cho thấy đang xảy ra quét toàn bộ bảng qua năm triệu dòng vì thiếu chỉ mục.',
        hint: 'execution plan, full table scan, index',
      },
      {
        text: 'Can we cancel the stuck reporting queries first so checkout traffic recovers?',
        translation:
          '[App Support] Mình hủy các truy vấn báo cáo bị treo trước để lưu lượng thanh toán phục hồi được không?',
        hint: 'cancel, stuck, recovers',
      },
      {
        text: 'Done, active connections just dropped by half, and I am routing reports to the read replica.',
        translation:
          '[DBA] Xong rồi, số kết nối đang mở vừa giảm một nửa, và tôi đang định tuyến các báo cáo sang bản sao chỉ đọc.',
        hint: 'routing, read replica',
      },
      {
        text: 'Should we add the missing composite index during off peak hours tonight?',
        translation:
          '[App Support] Chúng ta có nên thêm chỉ mục kết hợp còn thiếu vào giờ thấp điểm tối nay không?',
        hint: 'composite index, off peak hours',
      },
      {
        text: 'Even better, we can build it online concurrently without blocking production writes.',
        translation:
          '[DBA] Tốt hơn nữa, ta có thể tạo chỉ mục trực tuyến song song mà không làm nghẽn thao tác ghi trên production.',
        hint: 'concurrently, blocking, production writes',
      },
    ],
  },
  {
    id: 'lesson-audio-itops-05',
    videoId: 'audio-itops-05',
    title: '05. Load Balancer Health Checks & DNS Failover (IT Ops)',
    description:
      'Bridge call between Network Ops and a Cloud engineer coordinating multi-zone failover, draining unhealthy targets, and DNS TTL caching (~1 min, B1-B2).',
    voiceAccent: 'en-GB',
    level: 'Intermediate',
    items: [
      {
        text: 'David, synthetic monitors report intermittent errors from European users after our regional switch.',
        translation:
          '[NetOps] David ơi, hệ thống giám sát giả lập báo lỗi chập chờn từ người dùng châu Âu sau khi ta chuyển vùng.',
        hint: 'synthetic monitors, intermittent errors, regional switch',
      },
      {
        text: 'Let me check the load balancer; two backend nodes are still failing HTTP health checks.',
        translation:
          '[Cloud] Để tôi kiểm tra bộ cân bằng tải; hai máy chủ backend vẫn đang trượt kiểm tra sức khỏe HTTP.',
        hint: 'backend nodes, HTTP health checks',
      },
      {
        text: 'Why did the balancer keep sending requests to those unhealthy instances?',
        translation:
          '[NetOps] Tại sao bộ cân bằng tải vẫn tiếp tục gửi yêu cầu tới các máy chủ không khỏe mạnh đó?',
        hint: 'unhealthy instances',
      },
      {
        text: 'The failure threshold was set too high, so it waited nearly three minutes before draining them.',
        translation:
          '[Cloud] Ngưỡng báo lỗi bị đặt quá cao, nên nó chờ gần ba phút mới rút lưu lượng khỏi chúng.',
        hint: 'failure threshold, draining',
      },
      {
        text: 'I just tightened the health probe interval and shifted all traffic to our healthy availability zone.',
        translation:
          '[Cloud] Tôi vừa siết ngắn chu kỳ thăm dò sức khỏe và chuyển toàn bộ lưu lượng sang vùng sẵn sàng đang ổn định.',
        hint: 'health probe interval, availability zone',
      },
      {
        text: 'Some offices still see old IP addresses; is DNS caching slowing down the failover?',
        translation:
          '[NetOps] Một số văn phòng vẫn thấy địa chỉ IP cũ; có phải bộ nhớ đệm DNS đang làm chậm quá trình chuyển đổi dự phòng không?',
        hint: 'DNS caching, failover',
      },
      {
        text: 'Exactly, our DNS record had a long TTL, so external resolvers are still holding stale entries.',
        translation:
          '[Cloud] Chính xác, bản ghi DNS của mình đặt thời gian sống TTL quá dài nên các máy chủ phân giải ngoài vẫn giữ bản ghi cũ.',
        hint: 'DNS record, resolvers, stale entries',
      },
      {
        text: 'Once propagation settles, let us lower the TTL to sixty seconds for faster future failovers.',
        translation:
          '[NetOps] Khi việc lan truyền DNS ổn định, hãy hạ TTL xuống 60 giây để các lần chuyển đổi dự phòng sau nhanh hơn nhé.',
        hint: 'propagation settles, lower the TTL',
      },
    ],
  },
  {
    id: 'lesson-audio-itops-06',
    videoId: 'audio-itops-06',
    title: '06. Kubernetes Pod Crash Loop & Rollback (IT Ops)',
    description:
      'Release call between a Release Manager and DevOps engineer diagnosing CrashLoopBackOff, OOM kills, ConfigMap errors, and instant rollback (~1 min, B1-B2).',
    voiceAccent: 'en-GB',
    level: 'Intermediate',
    items: [
      {
        text: 'Elena, right after deploying the payment microservice, every new Kubernetes pod entered a crash loop.',
        translation:
          '[Release] Elena ơi, ngay sau khi triển khai microservice thanh toán, mọi pod Kubernetes mới đều rơi vào vòng lặp sập nguồn.',
        hint: 'deploying, microservice, crash loop',
      },
      {
        text: 'Hold the rollout immediately; are existing stable pods still serving live customer traffic?',
        translation:
          '[DevOps] Tạm dừng triển khai ngay; các pod ổn định cũ có còn đang phục vụ lưu lượng khách hàng thực không?',
        hint: 'rollout, serving live traffic',
      },
      {
        text: 'Yes, the readiness probe kept failed containers out of service, so users have not noticed yet.',
        translation:
          '[Release] Có, kiểm tra sẵn sàng đã giữ các container lỗi đứng ngoài dịch vụ nên người dùng vẫn chưa bị ảnh hưởng.',
        hint: 'readiness probe, containers',
      },
      {
        text: 'I am inspecting the container logs and pod events to find the exact exit code.',
        translation:
          '[DevOps] Tôi đang kiểm tra log container và sự kiện của pod để tìm mã thoát chính xác.',
        hint: 'container logs, pod events, exit code',
      },
      {
        text: 'Is it hitting the memory limit and getting terminated as out of memory?',
        translation:
          '[Release] Có phải nó chạm giới hạn bộ nhớ và bị hệ thống dừng do tràn bộ nhớ không?',
        hint: 'memory limit, terminated, out of memory',
      },
      {
        text: 'No, memory looks fine; the container crashed because a required API key is missing from the config map.',
        translation:
          '[DevOps] Không, bộ nhớ vẫn ổn; container bị sập vì thiếu một khóa API bắt buộc trong ConfigMap.',
        hint: 'required API key, config map',
      },
      {
        text: 'Let us trigger a deployment rollback now to clear the failed replica set cleanly.',
        translation:
          '[Release] Hãy kích hoạt hoàn tác triển khai ngay để dọn sạch bộ replica bị lỗi một cách gọn gàng.',
        hint: 'deployment rollback, replica set',
      },
      {
        text: 'Rollback succeeded, all replicas are running, and cluster error rates remain completely flat.',
        translation:
          '[DevOps] Hoàn tác thành công, mọi bản sao đều đang chạy và tỷ lệ lỗi cụm hoàn toàn bằng phẳng.',
        hint: 'replicas, cluster error rates',
      },
      {
        text: 'Before retrying tomorrow, let us add automated configuration validation inside our deployment pipeline.',
        translation:
          '[Release] Trước khi thử lại vào ngày mai, hãy thêm bước kiểm tra cấu hình tự động trong quy trình triển khai nhé.',
        hint: 'configuration validation, deployment pipeline',
      },
    ],
  },
  {
    id: 'lesson-audio-itops-07',
    videoId: 'audio-itops-07',
    title: '07. Backup Verification & Disaster Recovery Drill (IT Ops)',
    description:
      'Operations review between an Ops Manager and Backup Admin discussing RTO, RPO, point-in-time recovery, and immutable offsite backups (~1 min, B1-B2).',
    voiceAccent: 'en-GB',
    level: 'Intermediate',
    items: [
      {
        text: 'Good morning Tom, our compliance audit starts next week; are our disaster recovery metrics up to date?',
        translation:
          '[Ops Manager] Chào buổi sáng Tom, đợt kiểm toán tuân thủ bắt đầu tuần tới; các chỉ số phục hồi sau thảm họa của ta đã cập nhật chưa?',
        hint: 'compliance audit, disaster recovery metrics',
      },
      {
        text: 'Yes, we take full snapshots every Sunday and run incremental backups every single hour.',
        translation:
          '[Backup Admin] Rồi ạ, chúng ta chụp bản sao lưu đầy đủ mỗi Chủ nhật và chạy sao lưu gia tăng mỗi giờ.',
        hint: 'full snapshots, incremental backups',
      },
      {
        text: 'That keeps our recovery point objective under one hour, but what about actual restore speed?',
        translation:
          '[Ops Manager] Như vậy giữ mục tiêu điểm phục hồi RPO dưới một giờ, nhưng tốc độ khôi phục thực tế thì sao?',
        hint: 'recovery point objective, restore speed',
      },
      {
        text: 'We ran an automated restore drill in staging yesterday and verified full database integrity.',
        translation:
          '[Backup Admin] Hôm qua tụi em đã chạy diễn tập khôi phục tự động trên môi trường staging và kiểm chứng toàn vẹn dữ liệu.',
        hint: 'restore drill, staging, database integrity',
      },
      {
        text: 'How long did the entire point in time recovery take from start to finish?',
        translation:
          '[Ops Manager] Toàn bộ quá trình khôi phục về đúng thời điểm mất bao lâu từ đầu đến cuối?',
        hint: 'point in time recovery',
      },
      {
        text: 'Thirty five minutes total, comfortably beating our two hour recovery time objective target.',
        translation:
          '[Backup Admin] Tổng cộng 35 phút, vượt xa mục tiêu thời gian phục hồi RTO hai giờ của chúng ta.',
        hint: 'comfortably beating, recovery time objective',
      },
      {
        text: 'Are offsite copies stored in an immutable bucket to protect against ransomware attacks?',
        translation:
          '[Ops Manager] Các bản sao lưu ngoài site có được lưu trong kho bất biến để chống lại tấn công mã độc tống tiền không?',
        hint: 'offsite copies, immutable bucket, ransomware',
      },
      {
        text: 'Absolutely, object lock prevents any modification or deletion for ninety days, even with admin credentials.',
        translation:
          '[Backup Admin] Chắc chắn rồi, khóa đối tượng ngăn mọi chỉnh sửa hay xóa bỏ trong 90 ngày, kể cả với quyền quản trị.',
        hint: 'object lock, modification, admin credentials',
      },
    ],
  },
  {
    id: 'lesson-audio-itops-08',
    videoId: 'audio-itops-08',
    title: '08. Suspicious SSH Login & Firewall Hardening (IT Ops)',
    description:
      'Security escalation call between a SOC analyst and a SysOps engineer blocking SSH brute-force attacks and hardening bastion access (~1 min, B1-B2).',
    voiceAccent: 'en-GB',
    level: 'Intermediate',
    items: [
      {
        text: 'Hi Leo, our intrusion detection system just flagged thousands of failed SSH logins on edge server two.',
        translation:
          '[SOC] Chào Leo, hệ thống phát hiện xâm nhập vừa gắn cờ hàng nghìn lượt đăng nhập SSH thất bại trên máy chủ biên số hai.',
        hint: 'intrusion detection, flagged, SSH logins',
      },
      {
        text: 'Thanks for escalating quickly; did any unauthorized account actually succeed in logging in?',
        translation:
          '[SysOps] Cảm ơn đã báo leo thang sớm; có tài khoản trái phép nào thực sự đăng nhập thành công không?',
        hint: 'escalating, unauthorized account',
      },
      {
        text: 'No interactive sessions opened yet, though the traffic comes from a coordinated range of foreign IP addresses.',
        translation:
          '[SOC] Chưa có phiên tương tác nào được mở, nhưng lưu lượng đến từ một dải địa chỉ IP nước ngoài có phối hợp.',
        hint: 'interactive sessions, coordinated range',
      },
      {
        text: 'I am adding an immediate deny rule at the perimeter firewall to block those subnets.',
        translation:
          '[SysOps] Tôi đang thêm quy tắc chặn ngay lập tức trên tường lửa vòng ngoài để khóa các dải mạng con đó.',
        hint: 'deny rule, perimeter firewall, subnets',
      },
      {
        text: 'Why was the SSH port exposed directly to the public internet in the first place?',
        translation:
          '[SOC] Ngay từ đầu tại sao cổng SSH lại bị mở trực tiếp ra internet công cộng vậy?',
        hint: 'exposed directly, public internet',
      },
      {
        text: 'A contractor opened it briefly during migration and forgot to restrict access to our bastion host.',
        translation:
          '[SysOps] Một nhà thầu đã mở tạm lúc di chuyển hệ thống và quên giới hạn truy cập chỉ qua máy chủ trung gian bastion.',
        hint: 'contractor, migration, bastion host',
      },
      {
        text: 'Please disable password authentication completely so only hardware backed SSH keys are accepted.',
        translation:
          '[SOC] Vui lòng tắt hoàn toàn xác thực bằng mật khẩu để chỉ chấp nhận khóa SSH có bảo vệ phần cứng.',
        hint: 'disable password authentication, SSH keys',
      },
      {
        text: 'Done, firewall rules are locked down, service credentials are rotated, and audit logs are archived.',
        translation:
          '[SysOps] Xong rồi, quy tắc tường lửa đã khóa chặt, thông tin xác thực dịch vụ đã xoay mới và nhật ký kiểm toán đã được lưu trữ.',
        hint: 'locked down, credentials rotated, audit logs',
      },
    ],
  },
  {
    id: 'lesson-audio-itops-09',
    videoId: 'audio-itops-09',
    title: '09. Maintenance Window & Kernel Patching (IT Ops)',
    description:
      'Change Advisory Board call coordinating a low-risk Linux kernel security patch with snapshots, rolling updates, and smoke tests (~1 min, B1-B2).',
    voiceAccent: 'en-GB',
    level: 'Intermediate',
    items: [
      {
        text: "Thanks for joining the change advisory call; let us review Sunday's Linux kernel security patching.",
        translation:
          '[Change Mgr] Cảm ơn đã tham gia cuộc họp hội đồng quản lý thay đổi; cùng rà soát đợt vá bảo mật nhân Linux Chủ nhật này nhé.',
        hint: 'change advisory, kernel security patching',
      },
      {
        text: 'We scheduled the maintenance window for two in the morning when customer traffic is lowest.',
        translation:
          '[SysEng] Chúng tôi lên lịch khung thời gian bảo trì lúc hai giờ sáng khi lưu lượng khách hàng thấp nhất.',
        hint: 'maintenance window, lowest',
      },
      {
        text: 'Will customers experience full downtime while the application servers reboot?',
        translation:
          '[Change Mgr] Khách hàng có gặp tình trạng gián đoạn hoàn toàn trong lúc các máy chủ ứng dụng khởi động lại không?',
        hint: 'full downtime, reboot',
      },
      {
        text: 'No, we will perform rolling updates one node at a time across our redundant cluster.',
        translation:
          '[SysEng] Không ạ, ta sẽ cập nhật cuốn chiếu từng máy chủ một trong cụm dự phòng.',
        hint: 'rolling updates, redundant cluster',
      },
      {
        text: 'Before applying any patches, make sure fresh system snapshots are captured and verified.',
        translation:
          '[Change Mgr] Trước khi cài bất kỳ bản vá nào, hãy đảm bảo các bản chụp hệ thống mới đã được tạo và kiểm tra.',
        hint: 'patches, system snapshots, verified',
      },
      {
        text: 'Agreed, and if automated smoke tests fail on node one, we abort immediately and revert.',
        translation:
          '[SysEng] Nhất trí, và nếu kiểm thử nhanh tự động trên node một thất bại, ta hủy ngay lập tức và khôi phục lại.',
        hint: 'smoke tests, abort, revert',
      },
      {
        text: 'Has customer support already published the advance notice on our public status page?',
        translation:
          '[Change Mgr] Bộ phận hỗ trợ khách hàng đã đăng thông báo trước lên trang trạng thái công khai chưa?',
        hint: 'advance notice, status page',
      },
      {
        text: 'Yes, subscribers received email alerts yesterday, and the on call roster is confirmed ready.',
        translation:
          '[SysEng] Rồi ạ, người đăng ký đã nhận email thông báo hôm qua và lịch trực ứng cứu đã xác nhận sẵn sàng.',
        hint: 'subscribers, on call roster, confirmed',
      },
    ],
  },
  {
    id: 'lesson-audio-itops-10',
    videoId: 'audio-itops-10',
    title: '10. Blameless Postmortem & SLA Review (IT Ops)',
    description:
      'Post-incident review between an SRE Lead and Operations Engineer covering root cause analysis, SLA error budgets, alert fatigue, and runbooks (~1 min, B1-B2).',
    voiceAccent: 'en-GB',
    level: 'Intermediate',
    items: [
      {
        text: "Thanks everyone for joining this blameless postmortem for Tuesday's priority one gateway outage.",
        translation:
          '[SRE Lead] Cảm ơn mọi người đã tham gia buổi phân tích sau sự cố không đổ lỗi cho sự cố cổng ưu tiên cấp một hôm thứ Ba.',
        hint: 'blameless postmortem, priority one outage',
      },
      {
        text: 'Remember our goal is strengthening system reliability rather than blaming any individual engineer.',
        translation:
          '[SRE Lead] Hãy nhớ mục tiêu của ta là củng cố độ tin cậy hệ thống chứ không phải đổ lỗi cho bất kỳ kỹ sư cá nhân nào.',
        hint: 'strengthening, reliability, individual',
      },
      {
        text: 'Our timeline shows twenty two minutes of partial degradation before automated failover engaged.',
        translation:
          '[Ops Eng] Dòng thời gian ghi nhận 22 phút suy giảm hiệu năng một phần trước khi chuyển đổi dự phòng tự động kích hoạt.',
        hint: 'timeline, partial degradation, engaged',
      },
      {
        text: 'Did that outage breach our monthly service level agreement with enterprise clients?',
        translation:
          '[SRE Lead] Sự cố đó có làm vi phạm cam kết mức độ dịch vụ SLA hằng tháng với khách hàng doanh nghiệp không?',
        hint: 'breach, service level agreement',
      },
      {
        text: "Fortunately no, we stayed within SLA, though we consumed half of this quarter's error budget.",
        translation:
          '[Ops Eng] May mắn là không, ta vẫn nằm trong SLA, dù đã tiêu hết một nửa ngân sách lỗi của quý này.',
        hint: 'consumed, error budget',
      },
      {
        text: 'What was the main contributing factor behind our delayed initial response?',
        translation:
          '[SRE Lead] Đâu là yếu tố góp phần chính dẫn đến việc phản hồi ban đầu bị chậm trễ?',
        hint: 'contributing factor, initial response',
      },
      {
        text: 'Severe alert fatigue; noisy low priority warnings buried the critical page in our incident channel.',
        translation:
          '[Ops Eng] Sự quá tải cảnh báo nghiêm trọng; các cảnh báo mức thấp ồn ào đã che lấp thông báo khẩn cấp trong kênh sự cố.',
        hint: 'alert fatigue, noisy warnings, buried',
      },
      {
        text: 'Let us silence non actionable alerts and update the incident runbook with clearer escalation steps.',
        translation:
          '[SRE Lead] Hãy tắt các cảnh báo không thể hành động và cập nhật sổ tay xử lý sự cố với các bước leo thang rõ ràng hơn.',
        hint: 'non actionable, incident runbook, escalation steps',
      },
      {
        text: 'I already created tracked tickets with owners and deadlines so every preventive action gets completed.',
        translation:
          '[Ops Eng] Tôi đã tạo sẵn các phiếu công việc có người phụ trách và hạn chót để mọi biện pháp phòng ngừa đều được hoàn tất.',
        hint: 'tracked tickets, preventive action',
      },
    ],
  },
]

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
]

export const DEFAULT_A2_B1_AUDIO_LESSONS: Lesson[] = RAW_IT_OPS_A2_B1_SPECS.map(buildLesson)
export const DEFAULT_IT_OPS_B1_B2_AUDIO_LESSONS: Lesson[] = RAW_IT_OPS_SPECS.map(buildLesson)
export const DEFAULT_B1_B2_AUDIO_LESSONS: Lesson[] = [
  ...DEFAULT_A2_B1_AUDIO_LESSONS,
  ...DEFAULT_IT_OPS_B1_B2_AUDIO_LESSONS,
]
export const DEFAULT_IT_OPS_AUDIO_LESSONS = DEFAULT_B1_B2_AUDIO_LESSONS
