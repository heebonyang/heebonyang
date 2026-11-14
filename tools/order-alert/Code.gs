// 0집 새 주문 · 공연 새 예매 메일 알림 (Google Apps Script)
// 5분마다 Firestore 의 orders(0집 CD 주문)와 tickets(공연 좌석 예매)를 확인해서,
// 지난번 이후 새로 들어온 것을 이 스크립트 주인의 Gmail 로 보냄.
// 홈페이지 음악 탭과 0집 페이지(heebonmd.web.app) 주문 모두 해당.
// 주문 내용은 이 스크립트를 만든 구글 계정(Firebase 프로젝트 주인)의 권한으로 읽음.
//
// 처음 한 번: 편집기 위쪽에서 함수 'setup' 을 골라 실행 → 권한 허용. 그 뒤로는 자동으로 돌아감.

const PROJECT = 'heebonyang';
const PRICE = 10000; // CD 한 장 가격 (택배비 포함)
const ADMIN_URL = 'https://heebonyang.web.app/admin';
const BASE = 'https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/documents';

// 5분마다 checkNewOrders 를 실행하도록 등록 (여러 번 실행해도 하나만 남음)
function setup() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'checkNewOrders') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('checkNewOrders').timeBased().everyMinutes(5).create();
  checkNewOrders();
  Logger.log('설정 완료: 5분마다 새 주문을 확인해 ' + Session.getEffectiveUser().getEmail() + ' 로 알려드려요.');
}

// 5분마다 실행되는 함수 (이름은 예전 그대로 두어서, 이미 설치했다면 코드만 바꿔 붙여넣으면 공연 예매 알림도 함께 와요)
function checkNewOrders() {
  try {
    checkNewTickets();
  } catch (e) {
    Logger.log('공연 예매 확인 실패: ' + e);
  }
  checkCdOrders();
}

function checkCdOrders() {
  const props = PropertiesService.getScriptProperties();
  let since = props.getProperty('since');
  // 처음 실행할 때는 지금 시각부터 (예전 주문은 보내지 않음)
  if (!since) {
    props.setProperty('since', new Date().toISOString());
    return;
  }

  const query = {
    structuredQuery: {
      from: [{ collectionId: 'orders' }],
      where: { fieldFilter: { field: { fieldPath: 'createdAt' }, op: 'GREATER_THAN', value: { timestampValue: since } } },
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'ASCENDING' }],
      limit: 50,
    },
  };
  const res = UrlFetchApp.fetch(BASE + ':runQuery', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(query),
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'x-goog-user-project': PROJECT },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) throw new Error('주문을 읽지 못했어요: ' + res.getContentText());

  const me = Session.getEffectiveUser().getEmail();
  JSON.parse(res.getContentText())
    .filter(function (row) { return row.document; })
    .forEach(function (row) {
      const f = row.document.fields || {};
      const val = function (k) {
        const x = f[k];
        if (!x) return '';
        if ('stringValue' in x) return x.stringValue;
        if ('integerValue' in x) return x.integerValue;
        if ('timestampValue' in x) return x.timestampValue;
        return '';
      };
      const no = row.document.name.split('/').pop();
      const qty = Number(val('qty')) || 1;
      const amount = (qty * PRICE).toLocaleString('ko-KR') + '원';
      const when = Utilities.formatDate(new Date(val('createdAt')), 'Asia/Seoul', 'yyyy.MM.dd HH:mm');
      const from = val('source') === 'shop' ? '홈페이지 음악 탭' : '0집 페이지';
      const lines = [
        '새 0집 주문이 들어왔어요. 입금을 확인하면 관리자 페이지 \'0집 주문\'에서 상태를 바꿔 주세요.',
        '',
        '주문번호: ' + no,
        '주문 시각: ' + when + ' (' + from + ')',
        '이름: ' + val('name'),
        '연락처: ' + val('phone'),
        '주소: ' + val('address'),
        '수량: ' + qty + '장 · 입금 금액 ' + amount,
        '입금자명: ' + val('depositor'),
        '요청사항: ' + (val('memo') || '없음'),
        '',
        '관리자 페이지: ' + ADMIN_URL,
      ];
      MailApp.sendEmail({
        to: me,
        subject: '[0집 주문] ' + val('name') + ' · ' + qty + '장 · ' + amount,
        body: lines.join('\n'),
      });
      since = val('createdAt');
      props.setProperty('since', since); // 보낸 주문까지 기억 (중간에 멈춰도 같은 메일을 두 번 보내지 않게)
    });
}

// ── 공연 새 예매 ─────────────────────────────────────────────────
function fsGet(path) {
  const res = UrlFetchApp.fetch(BASE + path, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'x-goog-user-project': PROJECT },
    muteHttpExceptions: true,
  });
  return res.getResponseCode() === 200 ? JSON.parse(res.getContentText()) : null;
}

function checkNewTickets() {
  const props = PropertiesService.getScriptProperties();
  let since = props.getProperty('ticketSince');
  // 처음 실행할 때는 지금 시각부터 (예전 예매는 보내지 않음)
  if (!since) {
    props.setProperty('ticketSince', new Date().toISOString());
    return;
  }

  const query = {
    structuredQuery: {
      from: [{ collectionId: 'tickets' }],
      where: { fieldFilter: { field: { fieldPath: 'createdAt' }, op: 'GREATER_THAN', value: { timestampValue: since } } },
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'ASCENDING' }],
      limit: 50,
    },
  };
  const res = UrlFetchApp.fetch(BASE + ':runQuery', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(query),
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'x-goog-user-project': PROJECT },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) throw new Error('예매를 읽지 못했어요: ' + res.getContentText());
  const rows = JSON.parse(res.getContentText()).filter(function (row) { return row.document; });
  if (!rows.length) return;

  // 1석 가격: 관리자 '0집 페이지' › 공연 › 1석 가격
  const page = fsGet('/settings/albumPage');
  const concert = page && page.fields && page.fields.concert && page.fields.concert.mapValue.fields || {};
  const price = Number(concert.ticketPrice && (concert.ticketPrice.integerValue || concert.ticketPrice.doubleValue)) || 0;

  const me = Session.getEffectiveUser().getEmail();
  rows.forEach(function (row) {
    const f = row.document.fields || {};
    const val = function (k) {
      const x = f[k];
      if (!x) return '';
      if ('stringValue' in x) return x.stringValue;
      if ('integerValue' in x) return x.integerValue;
      if ('timestampValue' in x) return x.timestampValue;
      return '';
    };
    const seats = ((f.seats && f.seats.arrayValue && f.seats.arrayValue.values) || []).map(function (v) { return v.stringValue; });
    const no = row.document.name.split('/').pop();
    const qty = Number(val('qty')) || seats.length || 1;
    const amount = price ? (qty * price).toLocaleString('ko-KR') + '원' : '가격 미정';
    const when = Utilities.formatDate(new Date(val('createdAt')), 'Asia/Seoul', 'yyyy.MM.dd HH:mm');
    const lines = [
      '새 공연 예매가 들어왔어요. 입금을 확인하면 관리자 페이지 \'공연 예매\'에서 \'입금 확인\'을 눌러 주세요.',
      '',
      '예매번호: ' + no,
      '예매 시각: ' + when,
      '좌석: ' + seats.join(', ') + ' (' + qty + '석)',
      '입금 금액: ' + amount,
      '이름: ' + val('name'),
      '연락처: ' + val('phone'),
      '입금자명: ' + val('depositor'),
      '요청사항: ' + (val('memo') || '없음'),
      '',
      '관리자 페이지: ' + ADMIN_URL,
    ];
    MailApp.sendEmail({
      to: me,
      subject: '[공연 예매] ' + val('name') + ' · ' + seats.join(' ') + ' · ' + amount,
      body: lines.join('\n'),
    });
    since = val('createdAt');
    props.setProperty('ticketSince', since); // 보낸 예매까지 기억 (같은 메일을 두 번 보내지 않게)
  });
}
