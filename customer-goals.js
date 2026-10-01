'use strict';
(function(G){
const contexts=[
 '단골에게 건네줄','의뢰인의 주문에 맞는','옛 기억을 떠올릴 수 있는','약방에서 사용할',
 '심야 배달에 쓸','분해와 작동 시험에 쓸','배에 싣고 오래 간직할','잊힌 시대 연구에 필요한',
 '복을 모아 둘','의상 작업에 참고할','살롱에 둘','방송에 소개할',
 '추모식에 사용할','온실에서 사용할','다음 의뢰에 사용할','진료에 사용할',
 '다음 마술 공연에 사용할','별길 탐사에 가져갈','작업장에서 점검하고 쓸','은퇴 뒤 모아 둘',
 '야간 열람실에 둘','심해 모임에 선보일','갱도에서 나온 것과 비교해 볼','수집 목록을 채울',
 '다가오는 경매에 출품할','자정 극장 무대에 쓸'
];
const specialties=[
 ['clock','jewelry'],['book','cosmic'],['relic'],['potion'],['tool','clock'],['tool','toy'],
 ['relic'],['book','relic'],['jewelry'],['mask','art'],['art','jewelry'],['music'],
 ['relic'],['potion'],['weapon','mask'],['potion','tool'],['mask'],['cosmic'],
 ['tool','clock'],['jewelry'],['book'],['art'],['jewelry','relic'],['mask','cosmic'],
 ['art','book'],['music','jewelry']
];
function create(o,lot,it,category,stable,legacy=false){
 const named=!legacy&&stable(o,'purchase-purpose')<.4;
 return{version:1,category:it.category,itemId:named?it.id:null,requestedUid:lot.uid,legacy,
  use:contexts[o.character]||'오래 사용할',name:named?it.name:category,
  minCondition:lot.condition>=3?3:Math.min(lot.condition??2,1),minGrade:Math.min(lot.grade,2)};
}
function fit(purpose,p,it,lot){
 if(!purpose)return{allowed:true,kind:'legacy',premium:1,reason:'이전 거래'};
 if(purpose.legacy&&purpose.requestedUid===lot.uid)return{allowed:true,kind:'requested',premium:1,reason:'이어받은 거래'};
 if(p.dislikes.includes(it.category))return{allowed:false,reason:'좋아하지 않는 품목'};
 const exact=purpose.itemId===it.id,same=purpose.category===it.category,favorite=p.likes.includes(it.category);
 if(!exact&&!same&&!favorite)return{allowed:false,reason:'방문 목적과 취향에 맞지 않음'};
 if((lot.condition??2)<purpose.minCondition)return{allowed:false,reason:'찾는 물건보다 보존 상태가 좋지 않음'};
 if(lot.grade<purpose.minGrade)return{allowed:false,reason:'원하는 제작 수준에 미치지 못함'};
 return{allowed:true,kind:exact?'requested':same?'purpose':'favorite',premium:exact?1.14:same?1.06:1,reason:exact?'찾던 물건':same?'방문 목적에 맞는 물건':'대신 검토할 선호품'};
}
function brief(purpose){return '오늘은 '+purpose.use+' 물건이 필요하다. 찾는 것은 '+purpose.name+'이다.'}
function claim(purpose){return brief(purpose)+' '+(purpose.minCondition>=3?'보존이 좋은 물건이어야 한다. ':'사용할 수 있는 상태면 된다. ')+(purpose.minGrade>=2?'솜씨가 거친 물건은 피하고 싶다.':'값과 쓰임새를 먼저 보겠다.')}
function decline(purpose,reason){const detail={'좋아하지 않는 품목':'이 품목은 내 취향이 아니어서 사지 않겠다.','방문 목적과 취향에 맞지 않음':'지금 필요한 용도와 다르고 좋아하는 품목도 아니라 사지 않겠다.','찾는 물건보다 보존 상태가 좋지 않음':'내가 필요한 상태보다 낡아서 사지 않겠다.','원하는 제작 수준에 미치지 못함':'필요한 제작 수준에 못 미쳐서 사지 않겠다.'};return '오늘 찾는 것은 '+purpose.name+'이다. '+(detail[reason]||'이 물건은 사지 않겠다.')}
G.PawnCustomerGoals={contexts,specialties,create,fit,brief,claim,decline,isExpert:(index,category)=>(specialties[index]||[]).includes(category)};
})(globalThis);
