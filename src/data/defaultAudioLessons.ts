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
    transcriptSource: 'ListenFlow B1-B2 Audio Studio',
    isVerified: true,
    sentences,
  }
}

const RAW_B1_B2_SPECS: RawAudioLessonSpec[] = [
  {
    id: 'lesson-audio-b1b2-01',
    videoId: 'audio-b1b2-01',
    title: '01. The Midnight Bakery on Elm Street (B1-B2)',
    description:
      'A short creative story about an unusual late-night bakery that brings lonely neighbors together (~1 min, B1-B2).',
    voiceAccent: 'en-US',
    level: 'Intermediate',
    items: [
      {
        text: 'Every Friday at eleven, a warm scent of cinnamon drifted down Elm Street.',
        translation: 'Mỗi thứ Sáu lúc mười một giờ, mùi hương quế ấm áp lại lan tỏa dọc con phố Elm.',
        hint: 'scent of cinnamon, drifted down',
      },
      {
        text: 'Unlike ordinary shops, the corner bakery only unlocked its door after midnight.',
        translation: 'Không giống những cửa tiệm bình thường, tiệm bánh góc phố chỉ mở cửa sau nửa đêm.',
        hint: 'ordinary, unlocked',
      },
      {
        text: 'Daniel, a tired software engineer, finally decided to investigate the glowing window.',
        translation: 'Daniel, một kỹ sư phần mềm mệt mỏi, cuối cùng quyết định tìm hiểu ô cửa sổ rực sáng ấy.',
        hint: 'investigate, glowing',
      },
      {
        text: 'Inside, an elderly baker named Clara was kneading dough with remarkable precision.',
        translation: 'Bên trong, một thợ làm bánh lớn tuổi tên Clara đang nhào bột với sự chính xác đáng kinh ngạc.',
        hint: 'kneading dough, remarkable precision',
      },
      {
        text: 'She explained that night-shift workers rarely had access to freshly baked bread.',
        translation: 'Bà giải thích rằng những người làm ca đêm hiếm khi có cơ hội thưởng thức bánh mì mới nướng.',
        hint: 'night-shift, rarely, access',
      },
      {
        text: 'Nurses, taxi drivers, and restless students gradually gathered around the wooden counter.',
        translation: 'Các y tá, tài xế taxi và những sinh viên trằn trọc dần tụ họp quanh quầy gỗ.',
        hint: 'restless, gradually, gathered',
      },
      {
        text: 'Rather than rushing home, strangers began exchanging stories over cups of herbal tea.',
        translation: 'Thay vì vội vã về nhà, những người xa lạ bắt đầu trao đổi câu chuyện bên tách trà thảo mộc.',
        hint: 'rather than, exchanging stories, herbal tea',
      },
      {
        text: 'Daniel realized that loneliness could dissolve surprisingly quickly in the right atmosphere.',
        translation: 'Daniel nhận ra rằng sự cô đơn có thể tan biến nhanh đến bất ngờ trong bầu không khí phù hợp.',
        hint: 'dissolve, surprisingly, atmosphere',
      },
      {
        text: 'By sunrise, the little bakery had quietly transformed an isolated neighborhood into a genuine community.',
        translation: 'Khi bình minh lên, tiệm bánh nhỏ đã lặng lẽ biến khu phố tách biệt thành một cộng đồng thực thụ.',
        hint: 'transformed, isolated, genuine community',
      },
    ],
  },
  {
    id: 'lesson-audio-b1b2-02',
    videoId: 'audio-b1b2-02',
    title: '02. Why Micro-Breaks Boost Your Focus (B1-B2)',
    description:
      'Discover how brief 2-minute pauses prevent cognitive fatigue and sustain productivity throughout the day (~1 min, B1-B2).',
    voiceAccent: 'en-GB',
    level: 'Intermediate',
    items: [
      {
        text: 'Many ambitious professionals believe that working nonstop guarantees higher productivity.',
        translation: 'Nhiều người đi làm đầy tham vọng tin rằng làm việc không ngừng nghỉ sẽ đảm bảo năng suất cao hơn.',
        hint: 'ambitious, guarantees, productivity',
      },
      {
        text: 'However, cognitive researchers have discovered that continuous concentration rapidly drains mental energy.',
        translation: 'Tuy nhiên, các nhà nghiên cứu nhận thức phát hiện rằng sự tập trung liên tục nhanh chóng làm cạn kiệt năng lượng tinh thần.',
        hint: 'cognitive, continuous, drains',
      },
      {
        text: 'When you ignore early signs of fatigue, subtle mistakes become far more frequent.',
        translation: 'Khi bạn phớt lờ những dấu hiệu mệt mỏi ban đầu, các sai sót nhỏ trở nên thường xuyên hơn nhiều.',
        hint: 'fatigue, subtle, frequent',
      },
      {
        text: 'Surprisingly, taking a two-minute micro-break every hour can restore your attention span.',
        translation: 'Đáng ngạc nhiên là việc nghỉ ngắn hai phút mỗi giờ có thể phục hồi khả năng tập trung của bạn.',
        hint: 'micro-break, restore, attention span',
      },
      {
        text: 'The secret is stepping away from bright screens rather than scrolling through social media.',
        translation: 'Bí quyết là rời khỏi màn hình sáng thay vì lướt mạng xã hội.',
        hint: 'stepping away, scrolling',
      },
      {
        text: 'Stretching your shoulders, gazing out a window, or sipping water allows the brain to reset.',
        translation: 'Vươn vai, nhìn ra ngoài cửa sổ hoặc nhấp ngụm nước giúp não bộ thiết lập lại trạng thái.',
        hint: 'gazing, sipping, reset',
      },
      {
        text: 'During these brief pauses, your subconscious mind continues organizing complex information quietly.',
        translation: 'Trong những quãng nghỉ ngắn này, tiềm thức của bạn tiếp tục sắp xếp thông tin phức tạp một cách lặng lẽ.',
        hint: 'subconscious, organizing, complex',
      },
      {
        text: 'As a result, you return to challenging tasks with renewed clarity and creative perspective.',
        translation: 'Kết quả là bạn quay lại các nhiệm vụ khó với sự minh mẫn mới và góc nhìn sáng tạo.',
        hint: 'renewed clarity, perspective',
      },
      {
        text: 'Consistent performance depends not on endless effort, but on sustainable rhythm.',
        translation: 'Hiệu suất ổn định không phụ thuộc vào nỗ lực vô tận, mà dựa vào nhịp độ bền vững.',
        hint: 'consistent, sustainable rhythm',
      },
    ],
  },
  {
    id: 'lesson-audio-b1b2-03',
    videoId: 'audio-b1b2-03',
    title: '03. A Phone Call That Changed My Career (B1-B2)',
    description:
      'A personal story about picking up an unexpected phone call and overcoming hesitation (~1 min, B1-B2 — great with Phone Mode!).',
    voiceAccent: 'en-US',
    level: 'Intermediate',
    items: [
      {
        text: 'Last Tuesday, my phone vibrated with an unfamiliar international number during lunch.',
        translation: 'Thứ Ba tuần trước, điện thoại tôi rung lên với một số quốc tế lạ đúng vào giờ ăn trưa.',
        hint: 'vibrated, unfamiliar',
      },
      {
        text: 'I normally let unknown callers go to voicemail, yet something urged me to answer.',
        translation: 'Tôi thường để các cuộc gọi lạ chuyển vào hộp thư thoại, nhưng điều gì đó đã thôi thúc tôi bắt máy.',
        hint: 'voicemail, urged',
      },
      {
        text: 'Due to background traffic noise, I had to concentrate carefully on every single syllable.',
        translation: 'Vì tiếng ồn giao thông xung quanh, tôi phải tập trung kỹ vào từng âm tiết một.',
        hint: 'background noise, concentrate, syllable',
      },
      {
        text: 'It turned out to be the hiring director from a design studio in Melbourne.',
        translation: 'Hóa ra đó là giám đốc tuyển dụng của một studio thiết kế tại Melbourne.',
        hint: 'turned out to be, hiring director',
      },
      {
        text: 'She had reviewed my online portfolio and wanted to discuss an urgent freelance project.',
        translation: 'Cô ấy đã xem hồ sơ năng lực trực tuyến của tôi và muốn trao đổi về một dự án tự do khẩn cấp.',
        hint: 'portfolio, urgent, freelance',
      },
      {
        text: 'Initially, I hesitated because the tight deadline sounded somewhat overwhelming.',
        translation: 'Ban đầu, tôi do dự vì hạn chót gấp gáp nghe có vẻ hơi quá sức.',
        hint: 'hesitated, tight deadline, overwhelming',
      },
      {
        text: 'Nevertheless, we negotiated reasonable milestones and clarified every technical requirement over the call.',
        translation: 'Tuy nhiên, chúng tôi đã thương lượng các mốc thời gian hợp lý và làm rõ mọi yêu cầu kỹ thuật qua cuộc gọi.',
        hint: 'nevertheless, negotiated, milestones, clarified',
      },
      {
        text: 'Delivering that assignment on schedule eventually led to a permanent remote position.',
        translation: 'Hoàn thành nhiệm vụ đó đúng tiến độ cuối cùng đã mang lại một vị trí làm việc từ xa chính thức.',
        hint: 'on schedule, eventually, permanent',
      },
      {
        text: 'Sometimes a single conversation on a noisy line can redirect your entire future.',
        translation: 'Đôi khi chỉ một cuộc trò chuyện qua đường dây nhiễu sóng cũng có thể chuyển hướng cả tương lai của bạn.',
        hint: 'redirect, entire',
      },
    ],
  },
  {
    id: 'lesson-audio-b1b2-04',
    videoId: 'audio-b1b2-04',
    title: '04. The Hidden Cost of Fast Fashion (B1-B2)',
    description:
      'An insightful look at why ultra-cheap clothing carries an environmental price tag and how consumers adapt (~1 min, B1-B2).',
    voiceAccent: 'en-GB',
    level: 'Intermediate',
    items: [
      {
        text: 'Scrolling through online catalogs, consumers are constantly tempted by rock-bottom clothing prices.',
        translation: 'Khi lướt các danh mục trực tuyến, người tiêu dùng liên tục bị cám dỗ bởi mức giá quần áo rẻ mạt.',
        hint: 'catalogs, constantly, tempted, rock-bottom',
      },
      {
        text: 'Fast-fashion brands release thousands of trendy items every week to encourage impulse buying.',
        translation: 'Các thương hiệu thời trang nhanh tung ra hàng nghìn mẫu hợp mốt mỗi tuần để kích thích mua sắm bốc đồng.',
        hint: 'trendy, encourage, impulse buying',
      },
      {
        text: 'Unfortunately, this rapid production cycle relies heavily on synthetic fabrics and excessive water.',
        translation: 'Đáng tiếc là chu kỳ sản xuất thần tốc này phụ thuộc nặng nề vào vải tổng hợp và lượng nước khổng lồ.',
        hint: 'cycle, relies heavily, synthetic, excessive',
      },
      {
        text: 'Because garments are cheaply stitched, many buyers discard them after only a handful of wears.',
        translation: 'Vì trang phục được may ẩu với chi phí thấp, nhiều người mua vứt bỏ chúng chỉ sau vài lần mặc.',
        hint: 'garments, discard, a handful of',
      },
      {
        text: 'Millions of tons of textile waste end up polluting landfills and coastal ecosystems annually.',
        translation: 'Hàng triệu tấn rác thải dệt may kết thúc bằng việc gây ô nhiễm bãi rác và hệ sinh thái ven biển hằng năm.',
        hint: 'textile waste, landfills, ecosystems',
      },
      {
        text: 'Growing awareness has recently inspired younger shoppers to embrace secondhand boutiques.',
        translation: 'Nhận thức ngày càng tăng gần đây đã truyền cảm hứng cho người mua trẻ đón nhận các cửa hàng đồ cũ.',
        hint: 'awareness, inspired, embrace, secondhand',
      },
      {
        text: 'Investing in durable, timeless pieces often saves money over the long run.',
        translation: 'Đầu tư vào những món đồ bền bỉ, vượt thời gian thường giúp tiết kiệm tiền về lâu dài.',
        hint: 'durable, timeless, over the long run',
      },
      {
        text: 'Choosing quality over quantity is a practical step toward a more sustainable wardrobe.',
        translation: 'Chọn chất lượng hơn số lượng là một bước đi thiết thực hướng tới tủ đồ bền vững hơn.',
        hint: 'quality over quantity, sustainable wardrobe',
      },
    ],
  },
  {
    id: 'lesson-audio-b1b2-05',
    videoId: 'audio-b1b2-05',
    title: '05. Lost in Kyoto Without a Map (B1-B2)',
    description:
      'What happens when your phone battery dies in a historic Japanese neighborhood and you rely on kindness (~1 min, B1-B2).',
    voiceAccent: 'en-AU',
    level: 'Intermediate',
    items: [
      {
        text: 'When my smartphone battery suddenly died in Kyoto, I felt completely disoriented at first.',
        translation: 'Khi pin điện thoại đột ngột cạn sạch ở Kyoto, ban đầu tôi cảm thấy hoàn toàn mất phương hướng.',
        hint: 'disoriented, suddenly',
      },
      {
        text: 'Narrow cobblestone alleys twisted in every direction, lined with traditional wooden teahouses.',
        translation: 'Những con hẻm lát đá hẹp uốn lượn về mọi hướng, hai bên là các quán trà gỗ truyền thống.',
        hint: 'cobblestone alleys, twisted, teahouses',
      },
      {
        text: 'Without GPS navigation, I had no choice but to slow down and observe my surroundings.',
        translation: 'Không có chỉ đường GPS, tôi không còn cách nào khác ngoài việc đi chậm lại và quan sát xung quanh.',
        hint: 'navigation, surroundings',
      },
      {
        text: 'At a quiet crossroads, a local shopkeeper noticed my puzzled expression and stepped outside.',
        translation: 'Tại một ngã tư yên tĩnh, một chủ tiệm địa phương nhận ra vẻ bối rối của tôi và bước ra ngoài.',
        hint: 'crossroads, puzzled expression',
      },
      {
        text: 'Although we shared few common words, she sketched clear landmarks on a paper napkin.',
        translation: 'Dù chúng tôi ít vốn từ chung, cô ấy vẫn phác thảo các địa điểm nổi bật rõ ràng lên tờ khăn giấy.',
        hint: 'sketched, landmarks',
      },
      {
        text: 'Following her handwritten directions, I stumbled upon a hidden bamboo courtyard untouched by crowds.',
        translation: 'Đi theo chỉ dẫn viết tay của cô ấy, tôi tình cờ phát hiện một khoảng sân tre ẩn mình vắng bóng đám đông.',
        hint: 'stumbled upon, courtyard, untouched',
      },
      {
        text: 'A gentle breeze rustled the leaves while rainwater dripped softly into a stone basin.',
        translation: 'Một làn gió nhẹ làm xào xạc tán lá trong khi nước mưa nhỏ giọt êm ái xuống bồn đá.',
        hint: 'breeze, rustled, stone basin',
      },
      {
        text: 'By the time I reached the main station, getting lost had become my favorite memory.',
        translation: 'Vào lúc tôi quay lại được ga chính, việc bị lạc đường đã trở thành kỷ niệm yêu thích nhất của tôi.',
        hint: 'reached, memory',
      },
    ],
  },
  {
    id: 'lesson-audio-b1b2-06',
    videoId: 'audio-b1b2-06',
    title: '06. The Art of Polite Disagreement (B1-B2)',
    description:
      'Learn diplomatic phrases and mindset shifts for expressing opposing viewpoints at work without conflict (~1 min, B1-B2).',
    voiceAccent: 'en-US',
    level: 'Intermediate',
    items: [
      {
        text: 'Disagreeing with a colleague in a meeting can feel awkward if not handled thoughtfully.',
        translation: 'Bất đồng quan điểm với đồng nghiệp trong cuộc họp có thể gây khó xử nếu không được xử lý khéo léo.',
        hint: 'colleague, awkward, thoughtfully',
      },
      {
        text: 'Many people either stay silent to preserve harmony or argue aggressively to win.',
        translation: 'Nhiều người hoặc chọn im lặng để giữ hòa khí, hoặc tranh luận gay gắt để giành phần thắng.',
        hint: 'preserve harmony, aggressively',
      },
      {
        text: 'Neither approach fosters genuine collaboration or leads to innovative team decisions.',
        translation: 'Cả hai cách tiếp cận đều không nuôi dưỡng sự hợp tác thực sự hay dẫn tới các quyết định đột phá của nhóm.',
        hint: 'fosters, collaboration, innovative',
      },
      {
        text: 'Effective communicators begin by acknowledging the valid points in another person’s proposal.',
        translation: 'Người giao tiếp hiệu quả bắt đầu bằng việc ghi nhận những điểm hợp lý trong đề xuất của người khác.',
        hint: 'acknowledging, valid points, proposal',
      },
      {
        text: 'Phrases like "I see where you’re coming from, though I have one concern" lower defensiveness.',
        translation: 'Những cụm từ như "Tôi hiểu góc nhìn của bạn, tuy nhiên tôi có một băn khoăn" giúp giảm thái độ phòng thủ.',
        hint: 'concern, defensiveness',
      },
      {
        text: 'Focusing strictly on objective evidence rather than personal criticism keeps the discussion productive.',
        translation: 'Chỉ tập trung vào bằng chứng khách quan thay vì chỉ trích cá nhân giúp cuộc thảo luận hiệu quả.',
        hint: 'objective evidence, criticism, productive',
      },
      {
        text: 'When teams welcome respectful debate, blind spots are identified before costly errors occur.',
        translation: 'Khi đội ngũ hoan nghênh tranh luận tôn trọng, các điểm mù được phát hiện trước khi sai lầm tốn kém xảy ra.',
        hint: 'respectful debate, blind spots, occur',
      },
      {
        text: 'True diplomacy transforms potential conflict into an opportunity for shared growth.',
        translation: 'Sự khéo léo thực sự biến xung đột tiềm ẩn thành cơ hội cùng phát triển.',
        hint: 'diplomacy, transforms, potential conflict',
      },
    ],
  },
  {
    id: 'lesson-audio-b1b2-07',
    videoId: 'audio-b1b2-07',
    title: '07. Why Cities Are Planting Vertical Forests (B1-B2)',
    description:
      'How modern architects cover skyscrapers with thousands of trees to cool concrete cities (~1 min, B1-B2).',
    voiceAccent: 'en-GB',
    level: 'Intermediate',
    items: [
      {
        text: 'Concrete skyscrapers trap solar heat, turning densely populated cities into scorching summer ovens.',
        translation: 'Những tòa nhà chọc trời bằng bê tông giữ nhiệt mặt trời, biến các đô thị đông đúc thành lò nướng mùa hè.',
        hint: 'concrete, trap, densely populated, scorching',
      },
      {
        text: 'To combat rising urban temperatures, visionary architects are designing vertical forests.',
        translation: 'Để đối phó với nhiệt độ đô thị gia tăng, các kiến trúc sư có tầm nhìn đang thiết kế những khu rừng thẳng đứng.',
        hint: 'combat, urban, visionary architects',
      },
      {
        text: 'Instead of plain glass facades, reinforced balconies hold hundreds of resilient shrubs and trees.',
        translation: 'Thay vì mặt kính trơn, các ban công gia cố chứa hàng trăm cây bụi và cây thân gỗ bền bỉ.',
        hint: 'facades, reinforced, resilient shrubs',
      },
      {
        text: 'Botanists carefully select native species capable of withstanding strong winds at high altitudes.',
        translation: 'Các nhà thực vật học chọn lọc kỹ những loài bản địa có khả năng chịu gió mạnh ở độ cao lớn.',
        hint: 'botanists, native species, withstanding, altitudes',
      },
      {
        text: 'This living curtain naturally filters airborne dust while absorbing substantial carbon dioxide.',
        translation: 'Bức rèm sống động này tự nhiên lọc bụi trong không khí đồng thời hấp thụ lượng lớn khí carbonic.',
        hint: 'airborne dust, absorbing, substantial',
      },
      {
        text: 'Inside the apartments, natural shade reduces air-conditioning consumption by nearly thirty percent.',
        translation: 'Bên trong các căn hộ, bóng râm tự nhiên giúp giảm lượng điện tiêu thụ điều hòa gần ba mươi phần trăm.',
        hint: 'consumption, nearly',
      },
      {
        text: 'Even better, birds and pollinators soon return, restoring fragile biodiversity to crowded districts.',
        translation: 'Tuyệt vời hơn, chim chóc và côn trùng thụ phấn sớm quay trở lại, khôi phục đa dạng sinh học mong manh cho các quận đông đúc.',
        hint: 'pollinators, fragile biodiversity',
      },
      {
        text: 'Green architecture proves that modern cities and thriving nature can coexist harmoniously.',
        translation: 'Kiến trúc xanh chứng minh rằng đô thị hiện đại và thiên nhiên trù phú có thể cùng tồn tại hài hòa.',
        hint: 'thriving, coexist harmoniously',
      },
    ],
  },
  {
    id: 'lesson-audio-b1b2-08',
    videoId: 'audio-b1b2-08',
    title: '08. The Mystery of the Unclaimed Suitcase (B1-B2)',
    description:
      'A clever short story set in an airport baggage claim with an unexpected coincidence (~1 min, B1-B2).',
    voiceAccent: 'en-US',
    level: 'Intermediate',
    items: [
      {
        text: 'By midnight, the airport baggage carousel had stopped spinning, leaving only one dark suitcase.',
        translation: 'Đến nửa đêm, băng chuyền hành lý sân bay đã ngừng quay, chỉ còn lại duy nhất một chiếc vali tối màu.',
        hint: 'baggage carousel, spinning',
      },
      {
        text: 'Exhausted from a delayed flight, Maya realized her own matching luggage had vanished.',
        translation: 'Kiệt sức sau chuyến bay bị hoãn, Maya nhận ra chiếc hành lý giống hệt của mình đã biến mất.',
        hint: 'exhausted, vanished',
      },
      {
        text: 'She checked the leather tag and discovered the name Leo Vance alongside a phone number.',
        translation: 'Cô kiểm tra thẻ hành lý bằng da và phát hiện cái tên Leo Vance cùng một số điện thoại.',
        hint: 'leather tag, alongside',
      },
      {
        text: 'Reluctant to wake a stranger, she hesitated before tapping the call button.',
        translation: 'Ngần ngại đánh thức một người xa lạ, cô chần chừ trước khi bấm nút gọi.',
        hint: 'reluctant, hesitated',
      },
      {
        text: 'Moments later, a relieved voice answered from a taxi twenty minutes away.',
        translation: 'Vài giây sau, một giọng nói nhẹ nhõm bắt máy từ chiếc taxi cách đó hai mươi phút chạy xe.',
        hint: 'relieved voice',
      },
      {
        text: 'Leo confessed he had grabbed the identical suitcase without inspecting the label.',
        translation: 'Leo thú nhận anh đã vội lấy chiếc vali giống hệt mà không kiểm tra nhãn tên.',
        hint: 'confessed, identical, inspecting',
      },
      {
        text: 'They agreed to meet at a bright terminal café to swap their belongings.',
        translation: 'Họ hẹn gặp nhau tại một quán cà phê sáng đèn trong nhà ga để trao đổi lại hành lý.',
        hint: 'terminal, swap, belongings',
      },
      {
        text: 'Over coffee, they laughed to discover both were attending the same architecture conference.',
        translation: 'Bên tách cà phê, họ bật cười khi phát hiện cả hai cùng tham dự một hội nghị kiến trúc.',
        hint: 'attending, conference',
      },
      {
        text: 'What began as an irritating travel blunder turned into an unforgettable friendship.',
        translation: 'Điều khởi đầu như một sự cố du lịch bực mình lại hóa thành một tình bạn khó quên.',
        hint: 'irritating, blunder, unforgettable',
      },
    ],
  },
  {
    id: 'lesson-audio-b1b2-09',
    videoId: 'audio-b1b2-09',
    title: '09. Digital Minimalism for Busy Minds (B1-B2)',
    description:
      'Practical habits to tame nonstop notifications and reclaim calm, intentional evenings (~1 min, B1-B2).',
    voiceAccent: 'en-AU',
    level: 'Intermediate',
    items: [
      {
        text: 'Our smartphones promise convenience, yet constant notifications fragment our daily peace of mind.',
        translation: 'Điện thoại thông minh hứa hẹn sự tiện lợi, nhưng thông báo liên tục lại làm vụn vỡ sự bình yên hằng ngày.',
        hint: 'fragment, peace of mind',
      },
      {
        text: 'Whenever a red badge flashes, our brain anticipates a tiny reward and loses focus.',
        translation: 'Mỗi khi biểu tượng đỏ nhấp nháy, não bộ lại mong chờ một phần thưởng nhỏ và đánh mất sự tập trung.',
        hint: 'anticipates, loses focus',
      },
      {
        text: 'Digital minimalism does not require abandoning technology or moving to a remote cabin.',
        translation: 'Tối giản kỹ thuật số không đòi hỏi bạn phải từ bỏ công nghệ hay chuyển lên một căn nhà gỗ hẻo lánh.',
        hint: 'minimalism, abandoning, remote cabin',
      },
      {
        text: 'Instead, it invites you to audit which applications genuinely enrich your life.',
        translation: 'Thay vào đó, nó mời gọi bạn rà soát xem ứng dụng nào thực sự làm phong phú cuộc sống của mình.',
        hint: 'audit, genuinely enrich',
      },
      {
        text: 'Start by muting non-essential alerts and removing distracting apps from your home screen.',
        translation: 'Hãy bắt đầu bằng việc tắt các cảnh báo không thiết yếu và gỡ bỏ ứng dụng gây xao nhãng khỏi màn hình chính.',
        hint: 'non-essential alerts, distracting',
      },
      {
        text: 'Establishing a phone-free hour before bedtime dramatically improves both sleep quality and mood.',
        translation: 'Thiết lập một giờ không điện thoại trước khi ngủ giúp cải thiện rõ rệt cả chất lượng giấc ngủ lẫn tâm trạng.',
        hint: 'establishing, dramatically improves',
      },
      {
        text: 'Without endless scrolling, evenings suddenly stretch longer, leaving room for reading or cooking.',
        translation: 'Không còn lướt màn hình vô tận, buổi tối bỗng dưng dài ra, nhường chỗ cho việc đọc sách hoặc nấu ăn.',
        hint: 'stretch longer, leaving room',
      },
      {
        text: 'When you control your attention deliberately, technology becomes a helpful servant rather than a master.',
        translation: 'Khi bạn kiểm soát sự chú ý một cách có chủ đích, công nghệ trở thành trợ thủ đắc lực thay vì làm chủ bạn.',
        hint: 'deliberately, servant',
      },
    ],
  },
  {
    id: 'lesson-audio-b1b2-10',
    videoId: 'audio-b1b2-10',
    title: '10. Customer Support Call: Flight Delay (B1-B2)',
    description:
      'A realistic customer-service phone call resolving a cancelled flight & rebooking (~1 min, B1-B2 — try Phone Call Mode!).',
    voiceAccent: 'en-US',
    level: 'Intermediate',
    items: [
      {
        text: 'Good evening, thank you for calling Horizon Airlines support; how may I assist you?',
        translation: 'Chào buổi tối, cảm ơn quý khách đã gọi đến tổng đài Horizon Airlines; tôi có thể hỗ trợ gì cho bạn?',
        hint: 'assist',
      },
      {
        text: 'Hi, my connecting flight to Chicago was cancelled due to severe storms.',
        translation: 'Chào bạn, chuyến bay nối chuyến đi Chicago của tôi đã bị hủy do bão lớn.',
        hint: 'connecting flight, severe storms',
      },
      {
        text: 'I need to attend an important client presentation tomorrow morning at nine sharp.',
        translation: 'Tôi cần tham dự một buổi thuyết trình quan trọng với khách hàng vào đúng chín giờ sáng mai.',
        hint: 'presentation, nine sharp',
      },
      {
        text: 'Certainly, let me pull up your itinerary using your six-letter booking reference.',
        translation: 'Chắc chắn rồi, để tôi tra cứu lịch trình của bạn bằng mã đặt chỗ sáu ký tự.',
        hint: 'itinerary, booking reference',
      },
      {
        text: 'I see two available seats on an alternative departure leaving at six-fifteen tomorrow.',
        translation: 'Tôi thấy còn hai ghế trống trên một chuyến bay thay thế khởi hành lúc sáu giờ mười lăm sáng mai.',
        hint: 'alternative departure',
      },
      {
        text: 'That works well, though could you verify whether my checked luggage will transfer automatically?',
        translation: 'Giờ đó rất ổn, nhưng bạn có thể xác nhận giúp hành lý ký gửi của tôi có tự động chuyển sang không?',
        hint: 'verify, checked luggage, transfer',
      },
      {
        text: 'Yes, your baggage is tagged for the final destination, and we are providing a hotel voucher tonight.',
        translation: 'Có ạ, hành lý đã được gắn thẻ tới điểm đến cuối cùng, và chúng tôi sẽ cấp phiếu khách sạn cho bạn tối nay.',
        hint: 'final destination, voucher',
      },
      {
        text: 'I truly appreciate your prompt assistance; could you email the updated boarding pass right away?',
        translation: 'Tôi thực sự cảm kích sự hỗ trợ nhanh chóng của bạn; bạn có thể gửi thẻ lên máy bay mới qua email ngay không?',
        hint: 'prompt assistance, boarding pass',
      },
      {
        text: 'It is already in your inbox, and we wish you a smooth, punctual journey tomorrow.',
        translation: 'Thư đã nằm trong hộp thư đến của bạn rồi ạ, chúc bạn ngày mai có một chuyến đi suôn sẻ và đúng giờ.',
        hint: 'smooth, punctual journey',
      },
    ],
  },
]

export const DEFAULT_B1_B2_AUDIO_LESSONS: Lesson[] = RAW_B1_B2_SPECS.map(buildLesson)
