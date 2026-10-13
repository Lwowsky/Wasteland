import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { REGISTRATION_FIELD_ICONS, REGISTRATION_DECORATION_ICONS } from '../src/features/playerTemplates/templateAssets.js';

const source = path => readFileSync(resolve(path),'utf8');
const webp = path => readFileSync(resolve(`public${path}`));

test('036: dedicated troop type and readiness icons are centrally defined and rendered', () => {
  assert.equal(REGISTRATION_FIELD_ICONS.troopType, '/images/registration/field-icons/main-troop-type.webp');
  assert.equal(REGISTRATION_FIELD_ICONS.readiness, '/images/registration/field-icons/readiness.webp');
  const player=source('src/features/registration/components/PlayerSection.jsx');
  const readiness=source('src/features/registration/components/ReadinessSection.jsx');
  assert.match(player, /<FieldIcon name="troopType"\s*\/>/);
  assert.doesNotMatch(player, /TEMPLATE_ASSETS\[data\.troopType\]/);
  assert.match(readiness, /src=\{REGISTRATION_FIELD_ICONS\.readiness\}/);
  assert.doesNotMatch(readiness, /<Crosshair/);
});

test('036: comment scroll and mandatory star assets remain separate named WebP files', () => {
  const comment = REGISTRATION_FIELD_ICONS.comment;
  const required = REGISTRATION_DECORATION_ICONS.required;
  const paths = [comment,required,REGISTRATION_FIELD_ICONS.troopType, REGISTRATION_FIELD_ICONS.readiness];
  for(const path of paths){
    const data=webp(path);
    assert.equal(data.toString('ascii',0,4),'RIFF',path);
    assert.equal(data.toString('ascii',8,12),'WEBP',path);
  }
  assert.notDeepEqual(webp(comment),webp(required));
  assert.match(source('src/pages/Registration/CommentSection.jsx'),/src=\{REGISTRATION_FIELD_ICONS\.comment\}/);
  assert.match(source('src/pages/Registration/RegistrationFeedback.jsx'),/src=\{REGISTRATION_DECORATION_ICONS\.required\}/);
});
