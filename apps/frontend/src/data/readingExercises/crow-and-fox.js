// Elementary retelling of the classic fable 狐狸和乌鸦.
// Focus words: 乌鸦、狐狸、肉、唱歌、好听.
const words = value => value.split(' / ').map(segment => {
  const [text, pinyin, meaning] = segment.split('|')
  return { text, pinyin, meaning }
})
// Sentence translations are authored separately from short phrase glosses.
const sentence = (value, translation) => {
  const tokens = words(value)
  const context = { text: tokens.map(word => word.text).join(''), translation }
  return tokens.map(word => ({ ...word, sentence: context }))
}
const read = (id, title, sentences) => ({ id, type: 'read', title,
  lines: [{ id: `${id}-paragraph`, speaker: null, words: sentences.flat() }],
})
const quiz = (id, type, target, prompt, options, answer, explanation) => ({
  id, type, label: prompt, 'target-phrase': target, prompt,
  options: options.map(([key, value]) => ({ id: key, words: words(value) })),
  answer: [answer], hint: explanation, explanation,
})
export const story = {
  createdAt: '2026-11-14T17:30:00Z', id: 'crow-and-fox-v1',
  title: '狐狸和乌鸦', pinyin: 'Hú li hé wū yā', translation: 'The fox and the crow',
  tagline: 'A CLASSIC FABLE · KIND WORDS OR A TRICK?', characters: {},
  steps: [
    read('meat', '第一幕 · 一块肉', [
      sentence('一天早上|yì tiān zǎo shang|one morning / ， / 乌鸦|wū yā|crow / 找到|zhǎo dào|found / 一块肉|yí kuài ròu|a piece of meat / 。', 'One morning, a crow found a piece of meat.'),
      sentence('乌鸦|wū yā|crow / 叼着肉|diāo zhe ròu|holding meat in its beak / ， / 飞到|fēi dào|flew to / 大树上|dà shù shang|a big tree / ， / 想慢慢吃|xiǎng màn màn chī|wanted to eat slowly / 。', 'Holding the meat in her beak, the crow flew up to a big tree to enjoy it slowly.'),
      sentence('狐狸|hú li|fox / 从树下|cóng shù xià|from beneath the tree / 走过|zǒu guò|walked past / ， / 看见了肉|kàn jiàn le ròu|saw the meat / 。', 'A fox walked past beneath the tree and saw the meat.'),
      sentence('狐狸|hú li|fox / 心里想|xīn li xiǎng|thought to himself / ： / “ / 这块肉|zhè kuài ròu|this piece of meat / 真好|zhēn hǎo|really good / ， / 可是|kě shì|but / 我不会飞|wǒ bú huì fēi|I cannot fly / ， / 怎么拿到呢|zěn me ná dào ne|how can I get it / ？ / ”', 'The fox thought, “That meat looks so good, but I cannot fly. How can I get it?”'),
      sentence('乌鸦|wū yā|crow / 低头看了看|dī tóu kàn le kan|looked down / 狐狸|hú li|fox / ， / 没有说话|méi yǒu shuō huà|did not speak / 。', 'The crow looked down at the fox without saying anything.'),
    ]),
    quiz('meat-word', 'word', '肉', 'Choose the word for “meat”.', [['tree', '树|shù|tree'], ['meat', '肉|ròu|meat'], ['crow', '乌鸦|wū yā|crow']], 'meat', '肉 means meat. The meat is what the fox wants.'),
    quiz('goal', 'choice', '拿到肉', 'What does the fox want?', [['meat', '拿到肉|ná dào ròu|get the meat'], ['fly', '学会飞|xué huì fēi|learn to fly'], ['sleep', '睡觉|shuì jiào|sleep']], 'meat', 'The fox notices the meat and wonders how to get it.'),
    read('greeting', '第二幕 · 为什么不说话？', [
      sentence('狐狸|hú li|fox / 笑着说|xiào zhe shuō|said smiling / ： / “ / 乌鸦|wū yā|crow / ， / 早上好|zǎo shang hǎo|good morning / ！ / ”', 'The fox smiled and said, “Good morning, Crow!”'),
      sentence('乌鸦|wū yā|crow / 看着狐狸|kàn zhe hú li|looked at the fox / ， / 还是|hái shi|still / 没有说话|méi yǒu shuō huà|did not speak / 。', 'The crow looked at the fox but still said nothing.'),
      sentence('狐狸又说|hú li yòu shuō|the fox said again / ： / “ / 你的家人|nǐ de jiā rén|your family / 都好吗|dōu hǎo ma|are they all well / ？ / 今天|jīn tiān|today / 天气真好|tiān qì zhēn hǎo|the weather is lovely / ， / 你为什么|nǐ wèi shén me|why do you / 不说话呢|bù shuō huà ne|not speak / ？ / ”', 'The fox continued, “Is your family well? The weather is lovely today. Why will you not speak?”'),
      sentence('乌鸦|wū yā|crow / 想回答|xiǎng huí dá|wanted to answer / ， / 可是|kě shì|but / 嘴里有肉|zuǐ lǐ yǒu ròu|had meat in her beak / 。', 'The crow wanted to answer, but she had meat in her beak.'),
      sentence('她想|tā xiǎng|she thought / ： / “ / 我一张嘴|wǒ yì zhāng zuǐ|as soon as I open my beak / ， / 肉就会掉|ròu jiù huì diào|the meat will fall / ， / 还是先不说|hái shi xiān bù shuō|better not speak yet / 。 / ”', 'She thought, “If I open my beak, the meat will fall. I had better stay quiet for now.”'),
    ]),
    quiz('fox-word', 'word', '狐狸', 'Choose the word for “fox”.', [['fox', '狐狸|hú li|fox'], ['crow', '乌鸦|wū yā|crow'], ['family', '家人|jiā rén|family']], 'fox', '狐狸 means fox, the animal speaking from below the tree.'),
    quiz('silence', 'choice', '嘴里有肉', 'Why does the crow stay silent?', [['angry', '她很生气|tā hěn shēng qì|she is angry'], ['meat', '怕肉掉下去|pà ròu diào xià qù|she fears the meat will fall'], ['sleep', '她睡着了|tā shuì zháo le|she is asleep']], 'meat', 'The crow already understands that opening her beak could make the meat fall.'),
    read('praise', '第三幕 · 真好听吗？', [
      sentence('狐狸|hú li|fox / 想了想|xiǎng le xiǎng|thought for a moment / ， / 换了个办法|huàn le ge bàn fǎ|tried another method / 。', 'The fox thought for a moment and tried another approach.'),
      sentence('他说|tā shuō|he said / ： / “ / 乌鸦|wū yā|crow / ， / 你真漂亮|nǐ zhēn piào liang|you are beautiful / ， / 你的声音|nǐ de shēng yīn|your voice / 一定很好听|yí dìng hěn hǎo tīng|must sound lovely / ！ / ”', 'He said, “Crow, you are beautiful. Your voice must be lovely!”'),
      sentence('乌鸦|wū yā|crow / 听了很高兴|tīng le hěn gāo xìng|felt happy hearing this / ， / 把头抬高|bǎ tóu tái gāo|raised her head / 。', 'The crow felt happy to hear this and lifted her head.'),
      sentence('狐狸又说|hú li yòu shuō|the fox continued / ： / “ / 请你唱歌|qǐng nǐ chàng gē|please sing / ， / 大家都说|dà jiā dōu shuō|everyone says / 你唱歌好听|nǐ chàng gē hǎo tīng|your singing sounds lovely / ， / 我也想听|wǒ yě xiǎng tīng|I want to listen too / 。 / ”', 'The fox continued, “Please sing. Everyone says your singing is lovely, and I want to hear it too.”'),
      sentence('其实|qí shí|actually / 狐狸|hú li|fox / 没有听过|méi yǒu tīng guo|had never heard / 乌鸦唱歌|wū yā chàng gē|the crow sing / ， / 眼睛|yǎn jing|eyes / 还看着肉|hái kàn zhe ròu|were still watching the meat / 。', 'In fact, the fox had never heard the crow sing, and his eyes were still on the meat.'),
    ]),
    quiz('sing-word', 'word', '唱歌', 'Choose the phrase for “to sing”.', [['eat', '吃饭|chī fàn|to eat'], ['sing', '唱歌|chàng gē|to sing'], ['speak', '说话|shuō huà|to speak']], 'sing', '唱歌 means to sing. Singing requires the crow to open her beak.'),
    quiz('praise-word', 'word', '好听', 'Choose the phrase for “pleasant to hear”.', [['pretty', '漂亮|piào liang|beautiful'], ['hungry', '饿|è|hungry'], ['pleasant', '好听|hǎo tīng|pleasant to hear']], 'pleasant', '好听 describes a pleasing sound. The fox uses it to flatter the crow.'),
    quiz('trick', 'prediction', '眼睛还看着肉', 'What is the fox likely hoping will happen if the crow sings?', [['fall', '肉掉下来|ròu diào xià lái|the meat falls down'], ['fly', '肉飞起来|ròu fēi qǐ lái|the meat flies up'], ['sleep', '乌鸦睡觉|wū yā shuì jiào|the crow sleeps']], 'fall', 'His eyes are still on the meat; he has never heard her sing.'),
    read('song', '第四幕 · 肉掉了', [
      sentence('乌鸦|wū yā|crow / 心里想|xīn li xiǎng|thought to herself / ： / “ / 原来|yuán lái|so it turns out / 我唱歌|wǒ chàng gē|my singing / 这么好听|zhè me hǎo tīng|sounds so lovely / ！ / ”', 'The crow thought, “So my singing really is lovely!”'),
      sentence('她忘了|tā wàng le|she forgot / 嘴里的肉|zuǐ lǐ de ròu|the meat in her beak / ， / 张开嘴|zhāng kāi zuǐ|opened her beak / 唱歌|chàng gē|to sing / 。', 'She forgot the meat in her beak and opened it to sing.'),
      sentence('才唱了一声|cái chàng le yì shēng|she had sung only one note / ， / 肉就掉到|ròu jiù diào dào|when the meat fell to / 树下面|shù xià mian|the ground beneath the tree / 。', 'She had sung only one note when the meat fell to the ground beneath the tree.'),
      sentence('狐狸|hú li|fox / 马上叼起肉|mǎ shàng diāo qǐ ròu|immediately picked up the meat in his mouth / ， / 跑走了|pǎo zǒu le|ran away / 。', 'The fox immediately picked up the meat in his mouth and ran away.'),
      sentence('乌鸦叫道|wū yā jiào dào|the crow cried / ： / “ / 等一等|děng yi děng|wait a moment / ， / 你不是|nǐ bú shì|were you not / 想听我唱歌吗|xiǎng tīng wǒ chàng gē ma|wanting to hear me sing / ？ / ”', 'The crow cried, “Wait! Did you not want to hear me sing?”'),
      sentence('狐狸|hú li|fox / 没有停下来|méi yǒu tíng xià lái|did not stop / ， / 也没有回答|yě méi yǒu huí dá|and did not answer / 。', 'The fox did not stop or answer.'),
    ]),
    quiz('crow-word', 'word', '乌鸦', 'Choose the word for “crow”.', [['crow', '乌鸦|wū yā|crow'], ['fox', '狐狸|hú li|fox'], ['meat', '肉|ròu|meat']], 'crow', '乌鸦 means crow. She opens her beak after believing the praise.'),
    quiz('real-goal', 'choice', '叼起肉，跑走了', 'What shows that the fox wanted the meat rather than a song?', [['listen', '坐下来听歌|zuò xià lái tīng gē|he sits and listens'], ['run', '拿到肉就跑|ná dào ròu jiù pǎo|he runs as soon as he gets the meat'], ['ask', '请她再唱|qǐng tā zài chàng|he asks her to sing again']], 'run', 'His actions after the meat falls reveal the purpose behind his praise.'),
    read('lesson', '第五幕 · 先想一想', [
      sentence('乌鸦|wū yā|crow / 看着空空的|kàn zhe kōng kōng de|looked at the empty / 树下面|shù xià mian|ground beneath the tree / ， / 很难过|hěn nán guò|felt sad / 。', 'The crow looked at the empty ground beneath the tree and felt sad.'),
      sentence('她说|tā shuō|she said / ： / “ / 狐狸说|hú li shuō|the fox said / 我唱歌好听|wǒ chàng gē hǎo tīng|my singing sounded lovely / ， / 可他没有听过|kě tā méi yǒu tīng guo|but he had never heard it / 。 / ”', 'She said, “The fox said my singing was lovely, but he had never heard it.”'),
      sentence('“ / 我只想听|wǒ zhǐ xiǎng tīng|I only wanted to hear / 好听的话|hǎo tīng de huà|pleasant words / ， / 没有想|méi yǒu xiǎng|did not think / 他为什么|tā wèi shén me|why he / 让我唱歌|ràng wǒ chàng gē|asked me to sing / 。 / ”', '“I only wanted to hear pleasant words. I did not think about why he asked me to sing.”'),
      sentence('乌鸦|wū yā|crow / 不是|bú shì|was not / 不能唱歌|bù néng chàng gē|unable to sing / ， / 也不是|yě bú shì|nor was it that / 不能高兴|bù néng gāo xìng|she could not feel happy / 。', 'The problem was not that the crow could not sing or enjoy herself.'),
      sentence('她想|tā xiǎng|she thought / ： / “ / 下次|xià cì|next time / 先把肉|xiān bǎ ròu|first the meat / 放好|fàng hǎo|put somewhere secure / ， / 再想想|zài xiǎng xiang|then think about / 别人的话|bié rén de huà|other people’s words / ， / 不能|bù néng|must not / 一高兴|yì gāo xìng|as soon as I feel happy / 就全忘了|jiù quán wàng le|forget everything / 。 / ”', 'She thought, “Next time I will put my food somewhere secure and think about what others say, instead of forgetting everything as soon as I feel happy.”'),
    ]),
    quiz('pleasant-review', 'word', '好听的话', 'What does 好听 mean in 好听的话?', [['pleasant', '好听|hǎo tīng|pleasant to hear'], ['large', '大|dà|big'], ['cold', '冷|lěng|cold']], 'pleasant', '好听 can describe pleasant words as well as music. Pleasant words can still be misleading.'),
    quiz('apply', 'prediction', '先把肉放好', 'If someone praises her while she is holding food again, what would show she learned?', [['drop', '马上张嘴唱歌|mǎ shàng zhāng zuǐ chàng gē|immediately open her beak and sing'], ['think', '放好食物|fàng hǎo shí wù|secure the food / ， / 再想一想|zài xiǎng yi xiǎng|then think it over'], ['never', '永远不唱歌|yǒng yuǎn bù chàng gē|never sing again']], 'think', 'She can still enjoy singing while protecting her food and considering why someone is praising her.'),
    read('next-day', '第六幕 · 再听见好话', [
      sentence('第二天|dì èr tiān|the next day / ， / 乌鸦|wū yā|crow / 又找到|yòu zhǎo dào|found again / 一小块肉|yì xiǎo kuài ròu|a small piece of meat / ， / 飞回|fēi huí|flew back to / 那棵大树|nà kē dà shù|that big tree / 。', 'The next day, the crow found another small piece of meat and flew back to the big tree.'),
      sentence('一只小鸟|yì zhī xiǎo niǎo|a little bird / 对她说|duì tā shuō|said to her / ： / “ / 乌鸦|wū yā|Crow / ， / 今天|jīn tiān|today / 你真精神|nǐ zhēn jīng shen|you look lively / ！ / ”', 'A little bird said to her, “Crow, you look lively today!”'),
      sentence('乌鸦|wū yā|crow / 先把肉|xiān bǎ ròu|first the meat / 放在|fàng zài|put in / 树上的小洞里|shù shang de xiǎo dòng lǐ|a small hole in the tree / ， / 再说|zài shuō|then said / ： / “ / 谢谢你|xiè xie nǐ|thank you / ！ / ”', 'The crow first put the meat in a small hole in the tree, then said, “Thank you!”'),
      sentence('小鸟问|xiǎo niǎo wèn|the little bird asked / ： / “ / 你喜欢唱歌吗|nǐ xǐ huan chàng gē ma|do you like singing / ？ / ”', 'The little bird asked, “Do you like singing?”'),
      sentence('乌鸦说|wū yā shuō|the crow said / ： / “ / 喜欢|xǐ huan|I do / ， / 不过|bú guò|however / 我现在|wǒ xiàn zài|right now I / 要先吃饭|yào xiān chī fàn|want to eat first / 。 / ”', 'The crow said, “I do, but right now I want to eat first.”'),
      sentence('这一次|zhè yí cì|this time / ， / 乌鸦|wū yā|crow / 听见好听的话|tīng jiàn hǎo tīng de huà|heard pleasant words / 也很高兴|yě hěn gāo xìng|and felt happy too / ， / 可是|kě shì|but / 没有忘记|méi yǒu wàng jì|did not forget / 自己的肉|zì jǐ de ròu|her own meat / 。', 'This time the crow was happy to hear pleasant words, but she did not forget her meat.'),
      sentence('她低头看看|tā dī tóu kàn kan|she looked down at / 小洞里的肉|xiǎo dòng lǐ de ròu|the meat in the small hole / ， / 又看看小鸟|yòu kàn kan xiǎo niǎo|then looked at the little bird / ， / 安心地笑了|ān xīn de xiào le|smiled with relief / 。', 'She checked the meat in the small hole, looked at the little bird, and smiled with relief.'),
    ]),
    quiz('sing-review', 'word', '唱歌', 'Which phrase means “to sing”?', [['sing', '唱歌|chàng gē|to sing'], ['eat', '吃饭|chī fàn|to eat'], ['thanks', '谢谢|xiè xie|thank you']], 'sing', '唱歌 means to sing. The crow still likes singing after learning her lesson.'),
    quiz('changed', 'choice', '先放好，再说话', 'What has changed in the crow’s behavior?', [['safe', '先放好肉|xiān fàng hǎo ròu|first secure the meat / ， / 再说话|zài shuō huà|then speak'], ['sad', '不再高兴|bú zài gāo xìng|she never feels happy again'], ['quiet', '永远不说话|yǒng yuǎn bù shuō huà|she never speaks again']], 'safe', 'She protects her food before answering. She can still enjoy kind words without repeating the mistake.'),
  ],
}
