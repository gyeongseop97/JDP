/* Fictional catalogue dates belong to this game's setting. */
(function(G){
const falseTales={clock:'먼 길을 떠나는 상인들이 잃어버린 짐을 찾으려고 만들었다.',jewelry:'밤길에 길을 잃지 않도록 마을 경비대가 주문했다.',weapon:'다친 짐승을 조용히 재우려고 숲의 의원이 만들었다.',book:'글을 처음 배우는 아이들의 연습용으로 만들었다.',potion:'극장의 무대 장치를 씻는 세척제로 처음 만들었다.',relic:'왕실 연회에 온 손님들에게 기념품으로 나눠 주었다.',music:'배 밑바닥의 균열을 찾으려고 조선공이 만들었다.',tool:'잃어버린 보석을 찾으려고 광산 감독이 주문했다.',mask:'축제가 끝나면 태워 버리는 일회용 장식으로 만들었다.',toy:'성문의 침입자를 잡기 위한 덫으로 처음 만들었다.',art:'식당에서 주문 순서를 표시하려고 만들었다.',cosmic:'평범한 유리를 가공해서 여행 기념품으로 팔기 시작했다.'};
const overrides={'potion-09':'편지에 쓴 글씨가 오래도록 지워지지 않게 하려고 조제했다.','tool-09':'종이에 남은 글씨를 지우려고 요정 재봉사가 만들었다.','clock-01':'종탑지기가 앞으로 닥칠 일을 미리 보려고 만들었다.','book-07':'빚을 갚지 않아도 이름이 남지 않도록 채무자가 만들었다.'};
G.PAWN_ORIGINS=Object.fromEntries(G.PAWN_ITEMS.map((it,i)=>[it.id,{year:1780+(i*37)%230,story:it.story.replace(/\.$/,'')+'.',alternative:overrides[it.id]||falseTales[it.category]}]));
// Counterfeit supply and access to rare stock are separate from honesty.
G.PAWN_SUPPLY=[
 [.27,.05],[.42,.20],[.36,.12],[.12,.08],[.28,.05],[.08,.08],
 [.25,.22],[.10,.20],[.55,.13],[.09,.04],[.18,.32],[.40,.12],
 [.16,.16],[.14,.08],[.13,.20],[.07,.07],[.50,.20],[.23,.30],
 [.30,.08],[.44,.23],[.06,.14],[.24,.27],[.18,.22],[.17,.36]
];
G.PAWN_SUPPLY.push(...(G.PAWN_EXTRA_GUESTS||[]).map(guest=>guest.supply));
})(globalThis);
