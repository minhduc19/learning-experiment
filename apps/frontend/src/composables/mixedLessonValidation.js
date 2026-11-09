import { normalizeActivityPrompt, audioPromptUrl } from './activityPrompt.js'
export function validateMixed(item, validateQuestion) {
  const d = item.data
  const fail = message => { throw new Error(`${item.id}: ${message}`) }
  const text = value => typeof value === 'string' && value.trim() && value.length <= 20000
  const unique = list => new Set(list).size === list.length
  const keys = (v, allowed) => { if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).some(key=>!allowed.includes(key))) fail('Invalid or unsupported activity fields') }
  if (item.type === 'sentence-jumble') {
    keys(d,['id','instruction','text-prompt','text-prompt-available','audio-prompt','prompt','sourceLanguage','targetLanguage','tiles','answers','translation','explanation'])
    item.data = normalizeActivityPrompt(d)
    const q=item.data
    if (!text(q.id)||!text(q.instruction)||!text(q.targetLanguage)||!text(q.translation)||!text(q.explanation)||typeof q['text-prompt-available']!=='boolean'||(q['text-prompt']!==null&&!text(q['text-prompt']))||(q['text-prompt-available']&&!q['text-prompt'])||(q['audio-prompt']!==null&&!audioPromptUrl(q['audio-prompt']))) fail('Invalid jumble prompt')
    if (!Array.isArray(q.tiles)||q.tiles.length<2||q.tiles.length>40) fail('Jumble needs 2–40 tiles')
    for (const tile of q.tiles) { keys(tile,['id','text']);if(!text(tile.id)||!text(tile.text))fail('Invalid tile') }
    const ids=q.tiles.map(t=>t.id)
    if (!unique(ids)||!Array.isArray(q.answers)||!q.answers.length||q.answers.length>20||q.answers.some(a=>!Array.isArray(a)||!a.length||!unique(a)||a.some(id=>!ids.includes(id))))fail('Invalid accepted tile sequences')
  } else if (item.type==='matching-pairs') {
    keys(d,['title','instruction','sourceLanguage','targetLanguage','pairs'])
    if (!['title','instruction','sourceLanguage','targetLanguage'].every(k=>text(d[k]))||!Array.isArray(d.pairs)||d.pairs.length<2||d.pairs.length>5)fail('Matching needs 2–5 pairs')
    for(const pair of d.pairs){keys(pair,['id','source','target']);if(!['id','source','target'].every(k=>text(pair[k])))fail('Invalid pair')}
    if(!unique(d.pairs.map(p=>p.id)))fail('Duplicate pair IDs')
  } else if(item.type==='reading') {
    keys(d,['id','title','titleTranslation','language','translationLanguage','blocks'])
    if(!text(d.id)||!text(d.title)||!Array.isArray(d.blocks)||!d.blocks.length||d.blocks.length>200||!unique(d.blocks.map(b=>b.id)))fail('Invalid reading blocks')
    for(const block of d.blocks){
      if(!text(block.id))fail('Reading blocks need IDs')
      if(block.type==='Multiple-choice') { keys(block,['id','type','question']);block.question=validateQuestion(block.question) }
      else if(block.type==='sentence') {
        keys(block,['id','type','translation','segments'])
        if(!Array.isArray(block.segments)||!block.segments.length)fail('Reading sentence needs segments')
        for(const segment of block.segments){keys(segment,['id','text','pinyin','details']);if(!text(segment.id)||!text(segment.text))fail('Invalid reading segment')}
      } else fail('Unsupported reading block type')
    }
  } else fail('Unsupported activity type')
}
