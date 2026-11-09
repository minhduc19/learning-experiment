import json
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from test_auth import account
from test_corpus import client as corpus_client_fixture
from test_corpus import corpus_database, imported, pytestmark  # noqa: F401
client=corpus_client_fixture


def sample():
    return json.loads((Path(__file__).parents[2]/'frontend/src/data/sampleLesson.json').read_text())


def answers(doc):
    result=[]
    for item in doc['items']:
        d=item['data'];t=item['type']
        value={'option_id':d['answer']} if t=='multiple-choice' else {'answer':
          {'tile_ids':d['answers'][0]} if t=='sentence-jumble' else
          {'pair_ids':[p['id'] for p in d['pairs']]} if t=='matching-pairs' else
          {'checkpoints':{b['id']:b['question']['answer'] for b in d['blocks'] if b['type']=='Multiple-choice'}}}
        result.append({'item_id':item['id'],**value})
    return result


def test_mixed_crud_play_scoring_retry_and_ownership(client):
    doc=sample()
    response=client.post('/api/lessons',json=doc)
    assert response.status_code==201,response.text
    identifier=response.json()['id']
    assert [i['type'] for i in response.json()['document']['items']]==[i['type'] for i in doc['items']]
    start=client.post(f'/api/lessons/{identifier}/attempts')
    assert start.status_code==201,start.text
    attempt=start.json();payload=answers(attempt['document'])
    # Missing checkpoints and unknown tiles must not silently complete an attempt.
    bad=json.loads(json.dumps(payload));bad[1]['answer']['checkpoints']={}
    assert client.post(f"/api/lessons/attempts/{attempt['id']}/complete",json={'answers':bad}).status_code==422
    bad=json.loads(json.dumps(payload));bad[2]['answer']['tile_ids']=['unknown']
    assert client.post(f"/api/lessons/attempts/{attempt['id']}/complete",json={'answers':bad}).status_code==422
    finish=client.post(f"/api/lessons/attempts/{attempt['id']}/complete",json={'answers':payload})
    assert finish.status_code==200,finish.text
    assert finish.json()['correct']==4 and finish.json()['total']==4
    assert client.post(f"/api/lessons/attempts/{attempt['id']}/complete",json={'answers':payload}).json()==finish.json()
    with TestClient(app,base_url='https://testserver') as bob:
        account(bob)
        assert bob.get('/api/lessons/'+identifier).status_code==404
        assert bob.post(f'/api/lessons/{identifier}/attempts').status_code==404


def test_invalid_mixed_data(client):
    for change in [lambda d:d['items'][2]['data']['answers'].append(['unknown']), lambda d:d['items'][3]['data']['pairs'].pop(),lambda d:d['items'][1]['data']['blocks'].append(d['items'][1]['data']['blocks'][0])]:
        d=sample();change(d)
        assert client.post('/api/lessons',json=d).status_code==422


def test_character_search_matches_both_script_forms(client):
    imported(client,'學校。学习。')
    simple=client.get('/api/corpus/characters?character=学').json()['items']
    traditional=client.get('/api/corpus/characters?character=學').json()['items']
    assert {r['id'] for r in simple} == {r['id'] for r in traditional}
    assert {r['value'] for r in simple}=={'学','學'}


def test_each_type_is_graded_from_its_saved_definition(client):
    doc=sample();saved=client.post('/api/lessons',json=doc).json()
    for index in range(4):
        attempt=client.post(f"/api/lessons/{saved['id']}/attempts").json()
        payload=answers(attempt['document'])
        if index==0:
            q=doc['items'][0]['data'];payload[0]['option_id']=next(o['id'] for o in q['options'] if o['id']!=q['answer'])
        elif index==1:
            b=next(b for b in doc['items'][1]['data']['blocks'] if b['type']=='Multiple-choice')
            payload[1]['answer']['checkpoints'][b['id']]=next(o['id'] for o in b['question']['options'] if o['id']!=b['question']['answer'])
        elif index==2:
            payload[2]['answer']['tile_ids'].reverse()
        else:
            payload[3]['answer']['pair_ids'].pop()
        result=client.post(f"/api/lessons/attempts/{attempt['id']}/complete",json={'answers':payload})
        assert result.status_code==200,result.text
        assert result.json()['correct']==3 and result.json()['incorrect']==1
