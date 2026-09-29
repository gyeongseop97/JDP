/* v6.3: append-only guest roster. Existing save IDs keep their meaning. */
(function(G){
'use strict';
G.PAWN_EXTRA_GUESTS=[{
 character:{id:'c25',name:'레온',role:'은퇴한 왕실 경매사',age:30,look:24,sheet:3,cell:0,portrait:'guest-leon.png',color:'#b9c8ed',style:'느긋한 존댓말 · 근거 있는 흥정에 호의적',greeting:'반갑습니다, 사장님. 오늘은 제가 물건을 내놓는 쪽이군요.',good:'좋은 거래였습니다. 다음에도 이 자리에서 뵙죠.',bad:'미소까지 값에 넣진 마십시오. 물건 이야기로 돌아가죠.',returnLine:'다시 뵙습니다. 이 골목으로 돌아올 이유가 하나 늘었군요.',secret:'서른 살에 왕실 경매장을 떠났다. 스승이 누명을 쓰고 빼앗긴 소장품을 제 돈으로 하나씩 되찾고 있다. 모은 물건은 스승의 작은 집에 이름 없이 보내고 있다.',request:'오래된 그림과 주인의 기록이 남은 책을 찾습니다.'},
 profile:{likes:['art','book'],dislikes:['toy'],temperament:'collector',patience:5,expertise:.91,honesty:.84,frugality:.47,interest:'스승의 소장품 목록에 남은 그림과 오래된 책.',manner:'여유롭게 존댓말을 쓴다. 구체적인 흠을 짚으면 수긍하지만 빈말로 값을 깎으려 하면 냉정해진다.',lines:{}},
 supply:[.13,.32],register:'formal',lead:'보는 눈이 있으시군요. 설명드리죠. ',hearsay:'전 소유자에게 들은 이야기입니다. 제 눈으로 확인한 내용과는 구분해 주십시오.',tea:'경매장에서는 늘 다음 값을 기다렸습니다. 여기서는 차가 식는 것만 기다리면 되는군요. 이런 저녁도 나쁘지 않습니다.',
 voice:{
 sellerOpen:'반갑습니다, 사장님. 오늘은 {item} 하나 팔러 왔습니다. 천천히 보시죠.',
 buyerOpen:'반갑습니다, 사장님. 오늘은 사러 왔습니다. 저 {item}을 보여 주시겠습니까?',
 claim:'설명드리죠. {detail}',uncertainClaim:'전 소유자에게 들었습니다. {detail}',
 corrected:'제 기억에 착오가 있었군요. 확인하신 상태로 다시 이야기하죠.',
 caught:'알고도 빼놓은 부분입니다. 변명은 않겠습니다. 값을 다시 맞추시죠.',
 unfounded:'좋은 지적을 기대했습니다만, 그 흔적만으로는 부족하군요. 그 이유로 값을 깎기는 어렵습니다.',
 rapport:'값을 낮추는 이유가 분명하면 기꺼이 듣겠습니다. 서로 납득하고 악수하는 편이 좋지 않겠습니까?',
 need:'다시 사들이고 싶은 그림이 있습니다. 쓰지 않는 소장품을 팔아 그 돈에 보태려 합니다.',
 taste:'그림과 오래된 책을 찾습니다. 유명한 이름보다, 누군가 오래 아낀 흔적에 눈이 가는군요.',
 story:'왜 간직하셨는지 알겠습니다. 사연은 기억해 두죠. 이제 남은 상태도 보여 주시겠습니까?',
 offerAccepted:'{price}G, 좋습니다. 그 금액으로 거래하시죠.',
 counter:'제 쪽에서는 {price}G를 생각합니다. 서로 웃으며 끝낼 수 있는 값이면 좋겠군요.',
 offended:'사장님, 물건값을 논하는 자리입니다. 사람까지 깎아내릴 필요는 없지 않습니까?',
 walk:'오늘은 조건이 맞지 않는군요. 인사는 남기고 가겠습니다.',
 disclosed:'먼저 말씀해 주셔서 감사합니다. 그 상태라면 {price}G를 제안하겠습니다.',
 reassure:'사장님의 보증을 믿는 값으로 {price}G까지 내겠습니다.',
 pressure:'급한 거래일수록 한 번 더 봅니다. 제 판단까지 대신 서두르진 말아 주십시오.',
 originCaught:'도록과 맞지 않는군요. 출처가 불확실한 만큼 {price}G로 낮추겠습니다.',
 originDefend:'한 번 더 읽어 보시죠. 제가 말씀드린 내용과 그 기록은 어긋나지 않습니다.',
 discount:'그 흔적이라면 수긍하겠습니다. {price}G로 낮추시죠.',
 praise:'그 정도인 줄은 저도 몰랐습니다. 고맙습니다만, 그러면 {price}G는 받아야겠군요.',
 thanks:'그 부분을 알아보실 줄 알았습니다. 값은 그대로입니다. 다음에도 먼저 들르겠습니다.',
 noPraise:'무엇이 좋다는 뜻인지 조금 모호하군요. 값은 그대로 두겠습니다.'
 }
},{
 character:{id:'c26',name:'세린',role:'자정 극장의 가수',age:29,look:25,sheet:3,cell:1,portrait:'guest-serin.png',color:'#e2a7c5',style:'다정한 존댓말 · 납득할 이유에는 통 크게 양보',greeting:'안녕하세요, 사장님. 오늘 공연은 일찍 끝났어요.',good:'좋아요. 오늘은 기분 좋게 돌아가겠네요.',bad:'웃고 있어도 다 괜찮다는 뜻은 아니에요.',returnLine:'또 왔어요. 무대가 끝나면 이 골목이 생각나더라고요.',secret:'스물아홉 살의 극장 가수. 처음 무대에 섰던 작은 극장이 문을 닫지 않도록 공연 수입 일부를 익명으로 보낸다. 화려한 보석보다 첫 공연 때 받은 값싼 브로치를 가장 아낀다.',request:'무대 조명 아래에서도 예쁜 장신구와 작은 악기를 찾고 있어요.'},
 profile:{likes:['jewelry','music'],dislikes:['weapon'],temperament:'warm',patience:5,expertise:.68,honesty:.78,frugality:.33,interest:'무대에서 쓸 장신구와 공연이 끝난 뒤 혼자 연주할 악기.',manner:'다정하게 존댓말을 쓴다. 취향과 물건의 장점을 알아주면 마음을 열지만 외모 칭찬만으로 흥정하려 하면 선을 긋는다.',lines:{}},
 supply:[.19,.22],register:'polite',lead:'후후, 그게 궁금하셨군요. ',hearsay:'전 주인에게 들은 얘기예요. 제가 직접 확인한 건 아니니까, 그 점은 알아 두세요.',tea:'무대에선 조명이 꺼지면 바로 내려와야 하거든요. 여기선 노래하지 않아도 제 자리가 있네요. 차, 조금만 더 마시고 갈게요.',
 voice:{
 sellerOpen:'안녕하세요, 사장님. 공연 끝나고 들렀어요. 오늘은 {item} 하나 팔려고요.',
 buyerOpen:'안녕하세요, 사장님. 오늘은 제 선물을 사러 왔어요. 저 {item}, 가까이 봐도 될까요?',
 claim:'그 부분 말씀이죠? {detail}',uncertainClaim:'전 주인에게 들은 얘기예요. {detail}',
 corrected:'아, 다른 물건이랑 헷갈렸네요. 직접 보신 상태로 다시 이야기해요.',
 caught:'맞아요. 알고도 좋은 얘기만 했어요. 미안해요. 그만큼 값은 다시 맞춰 봐요.',
 unfounded:'어디가 흠인지 아직 모르겠어요. 그 흔적만으로 값을 깎아 드리긴 어렵겠네요.',
 rapport:'좋은 부분도 아쉬운 부분도 솔직하게 말씀해 주세요. 납득이 되면 저도 너무 붙잡고 있진 않을게요.',
 need:'공연 의상을 새로 맞추려고요. 한동안 쓰지 않은 물건을 정리해서 보태려 해요.',
 taste:'조명 아래에서 예쁜 장신구와 작은 악기를 좋아해요. 화려하기만 하고 손에 불편한 건 피하고요.',
 story:'그래서 아끼셨군요. 이야기해 주셔서 고마워요. 제가 써도 괜찮을 상태인지 조금 더 볼게요.',
 offerAccepted:'{price}G, 좋아요. 그 값으로 거래해요.',
 counter:'저는 {price}G면 좋겠어요. 그 정도는 맞춰 주실 수 있을까요?',
 offended:'사장님, 웃고 있어도 다 괜찮다는 뜻은 아니에요. 물건 얘기만 해 주세요.',
 walk:'오늘은 서로 원하는 값이 다른가 봐요. 아쉽지만 여기까지 할게요.',
 disclosed:'먼저 알려 주셔서 고마워요. 그 상태라면 {price}G는 낼 수 있어요.',
 reassure:'사장님 말씀을 믿어 볼게요. {price}G까지 생각하고 있어요.',
 pressure:'마지막 곡도 서두르면 아쉽잖아요. 조금만 더 보고 결정할게요.',
 originCaught:'제가 알고 있던 사연과 다르네요. 출처가 확실하지 않으니 {price}G로 낮출게요.',
 originDefend:'다시 읽어 봐 주실래요? 제가 한 말과 그 기록은 다르지 않아요.',
 discount:'그 흔적은 저도 보이네요. 그러면 {price}G로 낮출게요.',
 praise:'어머, 그런 점은 저도 몰랐어요. 고맙지만 그러면 {price}G는 받고 싶어요.',
 thanks:'그 부분이 저도 마음에 들었어요. 알아봐 주시니 좋네요. 값은 그대로지만 다음에도 들를게요.',
 noPraise:'어디가 좋은지는 아직 잘 모르겠어요. 값은 그대로 둘게요.'
 }
}];
for(const guest of G.PAWN_EXTRA_GUESTS){G.PAWN_CHARACTERS.push(guest.character);G.PAWN_PROFILES.push(guest.profile)}
})(globalThis);
