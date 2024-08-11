const express = require('express')
require('dotenv').config();
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const xml2js = require('xml2js');
const AdmZip = require('adm-zip');
const app = express()
const port = 3000

//https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS003&apiId=2019020



const apiKey = process.env.API_KEY;
const additionalApiUrl = `https://opendart.fss.or.kr/api/fnlttSinglAcnt.json?crtfc_key=${apiKey}&corp_code=${corpCode}&bsns_year=${bsnsYear}&reprt_code=${reprtCode}&idx_cl_code=${idxClCode}&fs_div=OFS`;
//특정 기업의 재무제표
const API_URL = `https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${apiKey}`;//모든 기업목록
const OUTPUT_ZIP_PATH = path.join(__dirname, 'companies.zip'); // 다운로드할 ZIP 파일 경로
const OUTPUT_FILE_PATH = path.join(__dirname, './corpCode/CORPCODE.xml'); // 저장할 파일 경로
const UNZIP_DIR = path.join(__dirname, '/corpCode'); // 압축 해제할 디렉토리

const xmlFilePath = './corpCode/CORPCODE.xml';// XML 파일 경로

let cachedData = null;  // 캐시 변수

const currentDate = new Date(); // 현재 날짜 가져오기
const currentYear = currentDate.getFullYear(); // 현재 연도
const currentMonth = currentDate.getMonth(); // 현재 월 (0부터 11까지)
const currentQuarter = Math.floor(currentMonth / 3) + 1; // 현재 분기 계산 (1~4)
const yearsList = [];

for (let i = 0; i <= 3; i++) {
    yearsList.push(currentYear - i); // 현재 연도에서 0, 1, 2, 3년 전 연도 추가
}



//npm install express axios adm-zip  //zip파일 풀기
//npm install express axios node-cron xml2js  //주기적으로 호출하기 
//npm install express axios
//npm install dotenv
//npm install express xml2js
//npm install nodemon --save-dev
//삼성E&A
//00126308

//http://localhost:3000/search?corp_code=00126308

// ZIP 파일 다운로드 및 압축 해제
const downloadAndUnzipFile = async () => {
  try {
      console.log('--------------------------------start api----------------------------')
      console.log(API_URL, ' ++ 기업목록 xml 다운로드 시작 ')
      const response = await axios.get(API_URL, { responseType: 'arraybuffer' });
      console.log(API_URL, ' ++ 기업목록 xml 다운로드 성공 ')
      
      // ZIP 파일 저장
      fs.writeFileSync(OUTPUT_ZIP_PATH, response.data);

      // ZIP 파일 압축 해제
      const zip = new AdmZip(OUTPUT_ZIP_PATH);
      zip.extractAllTo(UNZIP_DIR, true); // 압축 해제 (덮어쓰기)

      console.log('ZIP 파일이 다운로드 및 압축 해제되었습니다.');
  } catch (error) {
      console.error('API 호출 오류:', error);
      throw new Error('ZIP 파일 다운로드 및 압축 해제에 실패했습니다.');
  }
};


// 다운로드 및 XML 읽기 엔드포인트
app.get('/zip', async (req, res) => {
  try {
      await downloadAndUnzipFile();
      
      // 압축 해제된 XML 파일 경로
      const xmlFilePath = path.join(UNZIP_DIR, 'CORPCODE.xml'); // 압축 해제된 XML 파일 이름
      console.log('XML 파일 경로:', xmlFilePath); // XML 파일 경로 로그

      // XML 파일이 존재하는지 확인
      if (!fs.existsSync(xmlFilePath)) {
          console.error('XML 파일이 존재하지 않습니다:', xmlFilePath);
          return res.status(404).send('XML 파일을 찾을 수 없습니다.');
      }

      const xmlData = await loadXMLData(xmlFilePath);

      // XML 데이터를 캐시
      cachedData = xmlData; // XML 데이터를 메모리에 캐시
      console.log('XML 데이터가 메모리에 캐시되었습니다.');

      // 캐시 확인 메시지 추가
      if (cachedData) {
          console.log('캐시된 데이터:', cachedData); // 캐시된 데이터 출력
      }

      res.json(cachedData); // JSON 형식으로 응답

  } catch (error) {
      console.error('서버 오류:', error); // 오류 로그
      res.status(500).send('서버 오류: ZIP 파일 다운로드 및 XML 읽기에 실패했습니다.');
  }
});


// XML 파일을 읽고 JSON으로 변환하여 캐시
const loadXMLData = () => {
  return new Promise((resolve, reject) => { //비동기
    fs.readFile(xmlFilePath, 'utf8', (err, xmlData) => {
      if (err) {
        return reject(err);
      }
      xml2js.parseString(xmlData, (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result.result.list);
      });
    });
  });
};

// 서버 시작 시 XML 데이터를 로드하여 캐시
loadXMLData()
  .then(data => {
    cachedData = data;
    console.log('XML 데이터가 메모리에 캐시되었습니다.');
  })
  .catch(err => {
    console.error('XML 데이터 로드 오류:', err);
  });

app.get('/search', (req, res) => {
  const corpCode = req.query.corp_code;

  if (!corpCode) {
    return res.status(400).send('corp_code 쿼리 파라미터가 필요합니다.');
  }

  // 캐시된 데이터를 사용하여 검색
  const foundCorp = cachedData.find(item => item.corp_code[0] === corpCode);

  if (foundCorp) {
    const corpName = foundCorp.corp_name[0];
    res.send(`corp_name: ${corpName}`);
  } else {
    res.status(404).send('해당 corp_code를 찾을 수 없습니다.');
  }
});

// 다운로드 엔드포인트
app.get('/download', async (req, res) => {
  try {
      await downloadXmlFile();
      res.send('XML 파일이 성공적으로 다운로드되었습니다.');
  } catch (error) {
      res.status(500).send('서버 오류: XML 파일 다운로드에 실패했습니다.');
  }
});


app.get('/', (req, res) => {
  res.send(`${API_URL}`)
})

app.get('/api', (req,res) => {
  res.send(`Your API key is: ${apiKey}`);
})

// corp_code로 corp_name 검색 (쿼리 파라미터 사용)
app.get('/corp_name', (req, res) => {
  const corpCode = req.query.corp_code; // 쿼리 파라미터에서 corp_code 가져오기
  if (!cachedData) {
      return res.status(500).send('캐시된 데이터가 없습니다.');
  }

  const result = cachedData.find(item => item.corp_code[0] === corpCode);
  if (result) {
      res.json({ corp_code: result.corp_code[0], corp_name: result.corp_name[0] });
  } else {
      res.status(404).send('해당 corp_code를 찾을 수 없습니다.');
  }
});

// corp_name 하나를 받아서 그걸로 검색
// 검색한 값이 하나인 경우 해당 기업의 정보를 가져올 거임. -> 캐시된 데이터에서 찾을 것.
// 기업의 정보를 가져올텐데. 
app.get('/corp_code', async(req, res) => {
  const corpName = req.query.corp_name; // 쿼리 파라미터에서 corp_name 가져오기
  if (!cachedData || cachedData.length === 0) {
      return res.status(500).send('캐시된 데이터가 없습니다.');
  }

  // 부분 문자열 일치를 위해 filter 사용
  const results = cachedData.filter(item => 
      item.corp_name[0].includes(corpName) // corp_name의 첫 번째 요소에서 부분 문자열 검색
  );

  // 동일한 corp_name을 가진 항목들 중 최신 modify_date 찾기
  const uniqueResults = {};
  results.forEach(item => {
      const name = item.corp_name[0];
      if (!uniqueResults[name] || uniqueResults[name].modify_date[0] < item.modify_date[0]) {
          uniqueResults[name] = item; // 최신 항목으로 업데이트
      }
  });
  
   // uniqueResults 객체를 배열로 변환
  const finalResults = Object.values(uniqueResults);

  if (finalResults.length > 1) {// 여러 결과가 있을 경우, 그저 목록 반환
      const response = finalResults.map(item => ({
          corp_code: item.corp_code[0],
          corp_name: item.corp_name[0]
      }));
      res.json(response);
  } else if (finalResults.length === 1) {
    // 하나의 결과가 있을 경우
    const singleResult = finalResults[0];
    const corpCode = singleResult.corp_code[0];
    
    /*
    _reprtCode , 보고서코드
    1분기보고서 : 11013
    반기보고서 : 11012
    3분기보고서 : 11014
    사업보고서 : 11011
    ______
    _idxClCode , 지표분류코드
    수익성지표 : M210000 
    안정성지표 : M220000 
    성장성지표 : M230000 
    활동성지표 : M240000
    */
    //const bsnsYear = '2024' //사업연도
    const reprtCode = '11013'
    const reprtCodeList = ['11013','11012','11014','11011']
    const idxClCode = 'M210000'
    
    let yearOffset = 0; // 연도 오프셋 초기화
    let fetchedQuarters = 0; // 가져온 분기 수 초기화

    //Error: socket hang up, 8번 호출하면 dart 사이트 자체가 다운됨
    //내일 다시 시도
    /*
    while (fetchedQuarters < 1) {
        let year = currentYear - Math.floor((currentQuarter - 1 + yearOffset) / 4);
        let quarter = (currentQuarter - 1 + yearOffset) % 4 + 1;

        //임시로 dataImsy 데이터를 가져와서 분석하는걸로 
        // 데이터 확인 및 가져오기
        const response = await fetchFinancialIndicators(corpCode, year, reprtCode, idxClCode);

        //JSON 응답에서 데이터 확인
        if (response && response.data && Array.isArray(response.data)) {
            // 데이터가 존재하는 경우에만 추가
            quartersList.push({ year, quarter });
            fetchedQuarters++; // 가져온 분기 수 증가
        }

        yearOffset++; // 다음 분기를 위해 오프셋 증가
    }
        */
    let bsnsYear = currentYear - Math.floor((currentQuarter - 1 + yearOffset) / 4);
    console.log("bsnsYear : ", bsnsYear)
    let quarter = (currentQuarter - 1 + yearOffset) % 4 + 1;
    console.log("quarter"+quarter);
    const response = await fetchFinancialIndicators(corpCode, bsnsYear, reprtCodeList[0], idxClCode);
    //console.log(response);
    res.json(response);



    // // 다른 함수로 호출 (예시로 다른 함수를 호출)
    // fetchFinancialIndicators(corpCode, bsnsYear, reprtCode, idxClCode)
    //     .then(data => res.json(data)) // 다른 함수에서 반환된 데이터를 클라이언트에 응답
    //     .catch(err => res.status(500).send('서버 오류'));
  } else {
      res.status(404).send('해당 corp_name을 찾을 수 없습니다.');
  }
});

function fetchFinancialIndicators(corpCode, bsnsYear, reprtCode, idxClCode) {
  return new Promise(async (resolve, reject) => {

    
    try {
      // 추가 API에 요청
      console.log('--------------------------------start api----------------------------')
      console.log(API_URL, ' ++ 단일기업 재무제표 시작 ')
      const response = await axios.get(additionalApiUrl);
      console.log(API_URL, ' ++ 단일기업 재무제표 json 성공 ')

      console.log('additionalApiUrl: ',additionalApiUrl)
      console.log(response.data.list)
      
      // 가져온 데이터로 해결
      resolve(response.data);
    } catch (error) {
      // 오류 처리 및 프로미스 거부
      console.error('추가 API에서 데이터 가져오기 실패:', error);
      reject(error);
    }
  });
}

app.listen(port, () => {
  console.log(`서버가 http://localhost:${port}에서 실행 중입  니다.`);
});




// const dataImsy = {
//   "status": "000",
//   "message": "정상",
//   "list": [
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "ifrs-full_Assets",
//           "account_nm": "자산총계",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "5197143963010",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "5111061616312",
//           "ord": "7",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "ifrs-full_CurrentAssets",
//           "account_nm": "유동자산",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "3583427559739",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "3498226704403",
//           "ord": "8",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "dart_CurrentDerivativeAsset",
//           "account_nm": "유동파생상품자산",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "2621818536",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "8112010404",
//           "ord": "9",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "dart_CurrentFirmCommitmentAsset",
//           "account_nm": "유동확정계약자산",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "7085686485",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "7829698677",
//           "ord": "10",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "dart_ShortTermAdvancePayments",
//           "account_nm": "단기선급금",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "164556194315",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "171891716070",
//           "ord": "11",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "dart_ShortTermDueFromCustomersForContractWork",
//           "account_nm": "단기미청구공사",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "1542863039383",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "1349807380284",
//           "ord": "12",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "dart_ShortTermLoans",
//           "account_nm": "단기대여금",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "35552192862",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "37315108315",
//           "ord": "13",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "dart_ShortTermOtherReceivables",
//           "account_nm": "단기미수금",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "51679429643",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "26645859407",
//           "ord": "14",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "dart_ShortTermPrepaidConstructionCosts",
//           "account_nm": "단기선급공사원가",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "11520027026",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "12854089535",
//           "ord": "15",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "-표준계정코드 미사용-",
//           "account_nm": "유동 상각후원가측정유가증권",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "144720000",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "87920000",
//           "ord": "16",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "ifrs-full_CashAndCashEquivalents",
//           "account_nm": "현금및현금성자산",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "304307026854",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "435609768781",
//           "ord": "17",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "ifrs-full_CurrentPrepaidExpenses",
//           "account_nm": "유동선급비용",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "70653460073",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "51094793374",
//           "ord": "18",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "ifrs-full_CurrentTradeReceivables",
//           "account_nm": "유동매출채권",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "1082095029831",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "1128709799570",
//           "ord": "19",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "ifrs-full_OtherCurrentAssets",
//           "account_nm": "기타유동자산",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "81717143547",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "88168097344",
//           "ord": "20",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "ifrs-full_ShorttermDepositsNotClassifiedAsCashEquivalents",
//           "account_nm": "단기금융상품",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "228631791184",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "180100462642",
//           "ord": "21",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "ifrs-full_NoncurrentAssets",
//           "account_nm": "비유동자산",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "1613716403271",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "1612834911909",
//           "ord": "22",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "dart_LongTermDepositsProvidedGross",
//           "account_nm": "장기보증금자산",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "77961175947",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "72594500722",
//           "ord": "23",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "dart_LongTermPrepaidExpenses",
//           "account_nm": "장기선급비용",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "1328988349",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "2166157021",
//           "ord": "24",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "dart_NonCurrentFairValueFinancialAsset",
//           "account_nm": "비유동당기손익인식금융자산",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "20099161337",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "20085254304",
//           "ord": "25",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "-표준계정코드 미사용-",
//           "account_nm": "상각후원가로 측정하는 비유동 금융자산",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "915591567",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "1053490423",
//           "ord": "26",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "ifrs-full_DeferredTaxAssets",
//           "account_nm": "이연법인세자산",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "613187250439",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "609150361394",
//           "ord": "27",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "ifrs-full_IntangibleAssetsOtherThanGoodwill",
//           "account_nm": "영업권 이외의 무형자산",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "83627945967",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "80095170198",
//           "ord": "28",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "ifrs-full_InvestmentProperty",
//           "account_nm": "투자부동산",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "176075978999",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "176762738326",
//           "ord": "29",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "ifrs-full_InvestmentsInSubsidiariesJointVenturesAndAssociates",
//           "account_nm": "종속기업, 공동기업과 관계기업에 대한 투자자산",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "134754993547",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "133592570827",
//           "ord": "30",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "ifrs-full_NoncurrentDerivativeFinancialAssets",
//           "account_nm": "비유동파생상품자산",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "1908517008",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "2445158513",
//           "ord": "31",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "ifrs-full_NoncurrentFinancialAssetsMeasuredAtFairValueThroughOtherComprehensiveIncome",
//           "account_nm": "기타포괄손익-공정가치 측정 비유동금융자산",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "29104761784",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "28683891184",
//           "ord": "32",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "ifrs-full_NoncurrentRecognisedAssetsDefinedBenefitPlan",
//           "account_nm": "비유동 순확정급여자산",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "67790664721",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "79905944328",
//           "ord": "33",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "ifrs-full_OtherNoncurrentAssets",
//           "account_nm": "기타비유동자산",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "16298836155",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "17247271930",
//           "ord": "34",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "ifrs-full_PropertyPlantAndEquipment",
//           "account_nm": "유형자산",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "390662537451",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "389052402739",
//           "ord": "35",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "dart_ElementsOfOtherStockholdersEquity",
//           "account_nm": "기타자본구성요소",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "38180454373",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "33580677487",
//           "ord": "37",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "ifrs-full_Equity",
//           "account_nm": "자본총계",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "2431842452847",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "2306770461042",
//           "ord": "38",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "ifrs-full_IssuedCapital",
//           "account_nm": "자본금",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "980000000000",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "980000000000",
//           "ord": "39",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "ifrs-full_RetainedEarnings",
//           "account_nm": "이익잉여금(결손금)",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "1413661998474",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "1293189783555",
//           "ord": "40",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "ifrs-full_EquityAndLiabilities",
//           "account_nm": "자본과부채총계",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "5197143963010",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "5111061616312",
//           "ord": "41",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "ifrs-full_CurrentLiabilities",
//           "account_nm": "유동부채",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "2682583919187",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "2703893363094",
//           "ord": "43",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "dart_CurrentDerivativeLiabilities",
//           "account_nm": "유동파생상품부채",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "5695573685",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "3847733594",
//           "ord": "44",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "dart_CurrentFirmCommitmentLiabilities",
//           "account_nm": "유동확정계약부채",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "1471098824",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "979207553",
//           "ord": "45",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "dart_ShortTermAccruedExpenses",
//           "account_nm": "단기미지급비용",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "110759139922",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "157845517022",
//           "ord": "46",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "dart_ShortTermDueToCustomersForContractWork",
//           "account_nm": "단기초과청구공사",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "822787414969",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "926252895971",
//           "ord": "47",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "dart_ShortTermOtherPayables",
//           "account_nm": "단기미지급금",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "300065135983",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "264135848978",
//           "ord": "48",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "dart_ShortTermTradePayables",
//           "account_nm": "유동매입채무",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "478028112409",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "472942435804",
//           "ord": "49",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "dart_ShortTermWithholdings",
//           "account_nm": "단기예수금",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "55777124115",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "54034392551",
//           "ord": "50",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "ifrs-full_CurrentLoansReceivedAndCurrentPortionOfNoncurrentLoansReceived",
//           "account_nm": "단기차입금",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "106000000000",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "0",
//           "ord": "51",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "ifrs-full_CurrentTaxLiabilities",
//           "account_nm": "당기법인세부채",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "76146561610",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "64729179522",
//           "ord": "52",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "ifrs-full_OtherCurrentLiabilities",
//           "account_nm": "기타 유동부채",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "725853757670",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "759126152099",
//           "ord": "53",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "ifrs-full_Liabilities",
//           "account_nm": "부채총계",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "2765301510163",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "2804291155270",
//           "ord": "54",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "ifrs-full_NoncurrentLiabilities",
//           "account_nm": "비유동부채",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "82717590976",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "100397792176",
//           "ord": "55",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "dart_NonCurrentDerivativeLiabilities",
//           "account_nm": "비유동파생상품부채",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "330426360",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "416796191",
//           "ord": "56",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "dart_NonCurrentFinancialGuaranteeLiabilities",
//           "account_nm": "비유동금융보증부채",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "1401262853",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "2199838874",
//           "ord": "57",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "-표준계정코드 미사용-",
//           "account_nm": "비유동당기법인세부채",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "5414278551",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "15132700963",
//           "ord": "58",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "BS",
//           "sj_nm": "재무상태표",
//           "account_id": "ifrs-full_OtherNoncurrentLiabilities",
//           "account_nm": "기타 비유동 부채",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기말",
//           "thstrm_amount": "75571623212",
//           "frmtrm_nm": "제 57 기말",
//           "frmtrm_amount": "82648456148",
//           "ord": "59",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "IS",
//           "sj_nm": "손익계산서",
//           "account_id": "dart_OperatingIncomeLoss",
//           "account_nm": "영업이익(손실)",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "116778642598",
//           "thstrm_add_amount": "116778642598",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "128800886734",
//           "frmtrm_add_amount": "128800886734",
//           "ord": "6",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "IS",
//           "sj_nm": "손익계산서",
//           "account_id": "dart_OtherGains",
//           "account_nm": "기타이익",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "67383657925",
//           "thstrm_add_amount": "67383657925",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "383389875587",
//           "frmtrm_add_amount": "383389875587",
//           "ord": "7",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "IS",
//           "sj_nm": "손익계산서",
//           "account_id": "dart_OtherLosses",
//           "account_nm": "기타손실",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "42173557764",
//           "thstrm_add_amount": "42173557764",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "80083828024",
//           "frmtrm_add_amount": "80083828024",
//           "ord": "8",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "IS",
//           "sj_nm": "손익계산서",
//           "account_id": "dart_TotalSellingGeneralAdministrativeExpenses",
//           "account_nm": "판매비와관리비",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "117243088587",
//           "thstrm_add_amount": "117243088587",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "86915509179",
//           "frmtrm_add_amount": "86915509179",
//           "ord": "9",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "IS",
//           "sj_nm": "손익계산서",
//           "account_id": "ifrs-full_CostOfSales",
//           "account_nm": "매출원가",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "1382599122465",
//           "thstrm_add_amount": "1382599122465",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "1415144633238",
//           "frmtrm_add_amount": "1415144633238",
//           "ord": "10",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "IS",
//           "sj_nm": "손익계산서",
//           "account_id": "ifrs-full_BasicEarningsLossPerShare",
//           "account_nm": "기본주당이익(손실)",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "615",
//           "thstrm_add_amount": "615",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "1974",
//           "frmtrm_add_amount": "1974",
//           "ord": "12",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "IS",
//           "sj_nm": "손익계산서",
//           "account_id": "ifrs-full_FinanceCosts",
//           "account_nm": "금융원가",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "11515442242",
//           "thstrm_add_amount": "11515442242",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "25272661026",
//           "frmtrm_add_amount": "25272661026",
//           "ord": "13",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "IS",
//           "sj_nm": "손익계산서",
//           "account_id": "dart_InterestExpenseFinanceExpense",
//           "account_nm": "이자비용(금융원가)",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "4341858107",
//           "thstrm_add_amount": "4341858107",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "5645206811",
//           "frmtrm_add_amount": "5645206811",
//           "ord": "14",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "IS",
//           "sj_nm": "손익계산서",
//           "account_id": "dart_LossesOnForeignCurrencyTransactionsFiancialExpense",
//           "account_nm": "외환차손(금융원가)",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "5717760359",
//           "thstrm_add_amount": "5717760359",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "17100092878",
//           "frmtrm_add_amount": "17100092878",
//           "ord": "15",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "IS",
//           "sj_nm": "손익계산서",
//           "account_id": "dart_LossesOnForeignExchangeTranslationsFinancialExpense",
//           "account_nm": "외화환산손실(금융원가)",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "1455823776",
//           "thstrm_add_amount": "1455823776",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "2527361337",
//           "frmtrm_add_amount": "2527361337",
//           "ord": "16",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "IS",
//           "sj_nm": "손익계산서",
//           "account_id": "ifrs-full_FinanceIncome",
//           "account_nm": "금융수익",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "16878847692",
//           "thstrm_add_amount": "16878847692",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "22215994550",
//           "frmtrm_add_amount": "22215994550",
//           "ord": "17",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "IS",
//           "sj_nm": "손익계산서",
//           "account_id": "dart_GainsOnForeignCurrencyTransactionsFiancialIncome",
//           "account_nm": "외환차익(금융수익)",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "12050290027",
//           "thstrm_add_amount": "12050290027",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "20250765971",
//           "frmtrm_add_amount": "20250765971",
//           "ord": "18",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "IS",
//           "sj_nm": "손익계산서",
//           "account_id": "dart_GainsOnForeignExchangeTranslationsFinancialIncome",
//           "account_nm": "외화환산이익(금융수익)",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "1377823070",
//           "thstrm_add_amount": "1377823070",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "873606759",
//           "frmtrm_add_amount": "873606759",
//           "ord": "19",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "IS",
//           "sj_nm": "손익계산서",
//           "account_id": "dart_InterestIncomeFinanceIncome",
//           "account_nm": "이자수익(금융수익)",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "3450734595",
//           "thstrm_add_amount": "3450734595",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "1091621820",
//           "frmtrm_add_amount": "1091621820",
//           "ord": "20",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "IS",
//           "sj_nm": "손익계산서",
//           "account_id": "ifrs-full_GrossProfit",
//           "account_nm": "매출총이익",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "234021731185",
//           "thstrm_add_amount": "234021731185",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "215716395913",
//           "frmtrm_add_amount": "215716395913",
//           "ord": "21",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "IS",
//           "sj_nm": "손익계산서",
//           "account_id": "ifrs-full_IncomeTaxExpenseContinuingOperations",
//           "account_nm": "법인세비용(수익)",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "26879933290",
//           "thstrm_add_amount": "26879933290",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "42209171339",
//           "frmtrm_add_amount": "42209171339",
//           "ord": "22",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "IS",
//           "sj_nm": "손익계산서",
//           "account_id": "ifrs-full_ProfitLoss",
//           "account_nm": "당기순이익(손실)",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "120472214919",
//           "thstrm_add_amount": "120472214919",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "386841096482",
//           "frmtrm_add_amount": "386841096482",
//           "ord": "23",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "IS",
//           "sj_nm": "손익계산서",
//           "account_id": "ifrs-full_ProfitLossBeforeTax",
//           "account_nm": "법인세비용차감전순이익(손실)",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "147352148209",
//           "thstrm_add_amount": "147352148209",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "429050267821",
//           "frmtrm_add_amount": "429050267821",
//           "ord": "24",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "IS",
//           "sj_nm": "손익계산서",
//           "account_id": "ifrs-full_Revenue",
//           "account_nm": "수익(매출액)",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "1616620853650",
//           "thstrm_add_amount": "1616620853650",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "1630861029151",
//           "frmtrm_add_amount": "1630861029151",
//           "ord": "25",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CIS",
//           "sj_nm": "포괄손익계산서",
//           "account_id": "ifrs-full_ComprehensiveIncome",
//           "account_nm": "총포괄손익",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "125071991805",
//           "thstrm_add_amount": "125071991805",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "400164467546",
//           "frmtrm_add_amount": "400164467546",
//           "ord": "6",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CIS",
//           "sj_nm": "포괄손익계산서",
//           "account_id": "ifrs-full_OtherComprehensiveIncome",
//           "account_nm": "기타포괄손익",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "4599776886",
//           "thstrm_add_amount": "4599776886",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "13323371064",
//           "frmtrm_add_amount": "13323371064",
//           "ord": "7",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CIS",
//           "sj_nm": "포괄손익계산서",
//           "account_id": "ifrs-full_OtherComprehensiveIncomeThatWillBeReclassifiedToProfitOrLossNetOfTax",
//           "account_nm": "당기손익으로 재분류될 수 있는 항목(세후기타포괄손익)",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "5324157380",
//           "thstrm_add_amount": "5324157380",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "9824918536",
//           "frmtrm_add_amount": "9824918536",
//           "ord": "8",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CIS",
//           "sj_nm": "포괄손익계산서",
//           "account_id": "ifrs-full_GainsLossesOnCashFlowHedgesNetOfTax",
//           "account_nm": "현금흐름위험회피손익(세후기타포괄손익)",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "390564997",
//           "thstrm_add_amount": "390564997",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "-157642979",
//           "frmtrm_add_amount": "-157642979",
//           "ord": "9",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CIS",
//           "sj_nm": "포괄손익계산서",
//           "account_id": "ifrs-full_GainsLossesOnExchangeDifferencesOnTranslationNetOfTax",
//           "account_nm": "해외사업장환산외환차이(세후기타포괄손익)",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "3816872380",
//           "thstrm_add_amount": "3816872380",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "9982561515",
//           "frmtrm_add_amount": "9982561515",
//           "ord": "10",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CIS",
//           "sj_nm": "포괄손익계산서",
//           "account_id": "ifrs-full_GainsLossesOnFinancialAssetsMeasuredAtFairValueThroughOtherComprehensiveIncomeNetOfTax",
//           "account_nm": "기타포괄손익-공정가치로 측정되는 금융자산의 세후차손익",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "1116720003",
//           "thstrm_add_amount": "1116720003",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "0",
//           "frmtrm_add_amount": "0",
//           "ord": "11",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CIS",
//           "sj_nm": "포괄손익계산서",
//           "account_id": "ifrs-full_OtherComprehensiveIncomeThatWillNotBeReclassifiedToProfitOrLossNetOfTax",
//           "account_nm": "당기손익으로 재분류되지 않는항목(세후기타포괄손익)",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "-724380494",
//           "thstrm_add_amount": "-724380494",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "3498452528",
//           "frmtrm_add_amount": "3498452528",
//           "ord": "12",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CIS",
//           "sj_nm": "포괄손익계산서",
//           "account_id": "ifrs-full_OtherComprehensiveIncomeNetOfTaxGainsLossesFromInvestmentsInEquityInstruments",
//           "account_nm": "세후기타포괄손익, 지분상품에 대한 투자자산",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "316915562",
//           "thstrm_add_amount": "316915562",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "6084034916",
//           "frmtrm_add_amount": "6084034916",
//           "ord": "13",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CIS",
//           "sj_nm": "포괄손익계산서",
//           "account_id": "ifrs-full_OtherComprehensiveIncomeNetOfTaxGainsLossesOnRemeasurementsOfDefinedBenefitPlans",
//           "account_nm": "확정급여제도의 재측정손익(세후기타포괄손익)",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "-1041296056",
//           "thstrm_add_amount": "-1041296056",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "-2585582388",
//           "frmtrm_add_amount": "-2585582388",
//           "ord": "14",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CIS",
//           "sj_nm": "포괄손익계산서",
//           "account_id": "ifrs-full_ProfitLoss",
//           "account_nm": "당기순이익(손실)",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "120472214919",
//           "thstrm_add_amount": "120472214919",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "386841096482",
//           "frmtrm_add_amount": "386841096482",
//           "ord": "15",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CF",
//           "sj_nm": "현금흐름표",
//           "account_id": "dart_CashAndCashEquivalentsAtBeginningOfPeriodCf",
//           "account_nm": "기초현금및현금성자산",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "435609768781",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "224859201351",
//           "ord": "2",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CF",
//           "sj_nm": "현금흐름표",
//           "account_id": "dart_CashAndCashEquivalentsAtEndOfPeriodCf",
//           "account_nm": "기말현금및현금성자산",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "304307026854",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "327991156974",
//           "ord": "3",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CF",
//           "sj_nm": "현금흐름표",
//           "account_id": "ifrs-full_CashFlowsFromUsedInFinancingActivities",
//           "account_nm": "재무활동현금흐름",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "105302074248",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "193489183232",
//           "ord": "8",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CF",
//           "sj_nm": "현금흐름표",
//           "account_id": "dart_IncreaseInGuaranteeDepositsAsFinancialActivities",
//           "account_nm": "임대보증금의 증가",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "0",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "768620000",
//           "ord": "9",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CF",
//           "sj_nm": "현금흐름표",
//           "account_id": "ifrs-full_CashFlowsFromUsedInIncreaseDecreaseInCurrentBorrowings",
//           "account_nm": "유동차입금의 증가(감소)",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "106000000000",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "193600000000",
//           "ord": "10",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CF",
//           "sj_nm": "현금흐름표",
//           "account_id": "ifrs-full_PaymentsOfLeaseLiabilitiesClassifiedAsFinancingActivities",
//           "account_nm": "리스부채의 지급",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "697925752",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "879436768",
//           "ord": "11",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CF",
//           "sj_nm": "현금흐름표",
//           "account_id": "ifrs-full_CashFlowsFromUsedInInvestingActivities",
//           "account_nm": "투자활동현금흐름",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "-57354461920",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "-31490663118",
//           "ord": "12",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CF",
//           "sj_nm": "현금흐름표",
//           "account_id": "dart_DecreaseInGuaranteeDeposits",
//           "account_nm": "임차보증금의 감소",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "2285750279",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "1664242150",
//           "ord": "13",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CF",
//           "sj_nm": "현금흐름표",
//           "account_id": "dart_IncreaseInGuaranteeDeposits",
//           "account_nm": "임차보증금의 증가",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "2951840000",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "648000000",
//           "ord": "14",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CF",
//           "sj_nm": "현금흐름표",
//           "account_id": "dart_ProceedsFromSalesOfFinancialAssetsAtAmortisedCostClassifiedAsInvestingActivities",
//           "account_nm": "상각후원가측정금융자산의처분 - 투자활동",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "81150000",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "65985743",
//           "ord": "15",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CF",
//           "sj_nm": "현금흐름표",
//           "account_id": "dart_ProceedsFromSalesOfOtherNonCurrentFinancialAssets",
//           "account_nm": "기타비유동금융자산의 처분",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "1343806",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "3785417",
//           "ord": "16",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CF",
//           "sj_nm": "현금흐름표",
//           "account_id": "dart_PurchaseOfInvestmentsInSubsidiariesJointVenturesAndAssociates",
//           "account_nm": "종속기업, 조인트벤처와 관계기업에 대한 투자자산의 취득",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "1162422720",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "8892100000",
//           "ord": "17",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CF",
//           "sj_nm": "현금흐름표",
//           "account_id": "dart_PurchaseOfShortTermFinancialInstruments",
//           "account_nm": "단기금융상품의 취득",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "44287604665",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "555750",
//           "ord": "18",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CF",
//           "sj_nm": "현금흐름표",
//           "account_id": "-표준계정코드 미사용-",
//           "account_nm": "단기대여금의 증가",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "9290000000",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "13390000000",
//           "ord": "19",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CF",
//           "sj_nm": "현금흐름표",
//           "account_id": "-표준계정코드 미사용-",
//           "account_nm": "단기대여금의 감소",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "12490000000",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "5390000000",
//           "ord": "20",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CF",
//           "sj_nm": "현금흐름표",
//           "account_id": "ifrs-full_ProceedsFromSalesOfIntangibleAssetsClassifiedAsInvestingActivities",
//           "account_nm": "무형자산의 처분",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "0",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "2246000",
//           "ord": "21",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CF",
//           "sj_nm": "현금흐름표",
//           "account_id": "ifrs-full_ProceedsFromSalesOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities",
//           "account_nm": "유형자산의 처분",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "177238278",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "87285019",
//           "ord": "22",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CF",
//           "sj_nm": "현금흐름표",
//           "account_id": "ifrs-full_PurchaseOfIntangibleAssetsClassifiedAsInvestingActivities",
//           "account_nm": "무형자산의 취득",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "8666462308",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "7831449780",
//           "ord": "23",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CF",
//           "sj_nm": "현금흐름표",
//           "account_id": "ifrs-full_PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities",
//           "account_nm": "유형자산의 취득",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "6031614590",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "7942101917",
//           "ord": "24",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CF",
//           "sj_nm": "현금흐름표",
//           "account_id": "ifrs-full_CashFlowsFromUsedInOperatingActivities",
//           "account_nm": "영업활동현금흐름",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "-184131921473",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "-64710928134",
//           "ord": "25",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CF",
//           "sj_nm": "현금흐름표",
//           "account_id": "dart_AdjustmentsForAssetsLiabilitiesOfOperatingActivities",
//           "account_nm": "영업활동으로 인한 자산 부채의 변동",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "-288712633165",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "-472575962284",
//           "ord": "26",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CF",
//           "sj_nm": "현금흐름표",
//           "account_id": "ifrs-full_AdjustmentsForReconcileProfitLoss",
//           "account_nm": "당기순이익조정을 위한 가감",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "15716240430",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "-246419707624",
//           "ord": "27",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CF",
//           "sj_nm": "현금흐름표",
//           "account_id": "ifrs-full_DividendsReceivedClassifiedAsOperatingActivities",
//           "account_nm": "배당금수취(영업)",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "0",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "286373689021",
//           "ord": "28",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CF",
//           "sj_nm": "현금흐름표",
//           "account_id": "ifrs-full_IncomeTaxesPaidRefundClassifiedAsOperatingActivities",
//           "account_nm": "법인세환급(납부)",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "30775207215",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "14862431841",
//           "ord": "29",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CF",
//           "sj_nm": "현금흐름표",
//           "account_id": "ifrs-full_InterestPaidClassifiedAsOperatingActivities",
//           "account_nm": "이자지급(영업)",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "4274267943",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "4933473661",
//           "ord": "30",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CF",
//           "sj_nm": "현금흐름표",
//           "account_id": "ifrs-full_InterestReceivedClassifiedAsOperatingActivities",
//           "account_nm": "이자수취",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "3441731501",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "865861773",
//           "ord": "31",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CF",
//           "sj_nm": "현금흐름표",
//           "account_id": "ifrs-full_ProfitLoss",
//           "account_nm": "당기순이익(손실)",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "120472214919",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "386841096482",
//           "ord": "32",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CF",
//           "sj_nm": "현금흐름표",
//           "account_id": "ifrs-full_EffectOfExchangeRateChangesOnCashAndCashEquivalents",
//           "account_nm": "현금및현금성자산에 대한 환율변동효과",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "4881567218",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "5844363642",
//           "ord": "33",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "CF",
//           "sj_nm": "현금흐름표",
//           "account_id": "ifrs-full_IncreaseDecreaseInCashAndCashEquivalents",
//           "account_nm": "현금및현금성자산의순증가(감소)",
//           "account_detail": "-",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "-131302741927",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "103131955622",
//           "ord": "34",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "SCE",
//           "sj_nm": "자본변동표",
//           "account_id": "dart_EquityAtBeginningOfPeriod",
//           "account_nm": "기초자본",
//           "account_detail": "별도재무제표 [member]",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "2306770461042",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "1705581964600",
//           "ord": "3",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "SCE",
//           "sj_nm": "자본변동표",
//           "account_id": "dart_EquityAtBeginningOfPeriod",
//           "account_nm": "기초자본",
//           "account_detail": "자본 [구성요소]|기타자본구성요소 [구성요소]",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "33580677487",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "65884458677",
//           "ord": "3",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "SCE",
//           "sj_nm": "자본변동표",
//           "account_id": "dart_EquityAtBeginningOfPeriod",
//           "account_nm": "기초자본",
//           "account_detail": "자본 [구성요소]|이익잉여금 [구성요소]",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "1293189783555",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "659697505923",
//           "ord": "3",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "SCE",
//           "sj_nm": "자본변동표",
//           "account_id": "dart_EquityAtBeginningOfPeriod",
//           "account_nm": "기초자본",
//           "account_detail": "자본 [구성요소]|자본금 [구성요소]",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "980000000000",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "980000000000",
//           "ord": "3",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "SCE",
//           "sj_nm": "자본변동표",
//           "account_id": "-표준계정코드 미사용-",
//           "account_nm": "기타포괄손익-공정가치로 측정되는 금융자산의 평가손익",
//           "account_detail": "별도재무제표 [member]",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "1433635565",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "6084034916",
//           "ord": "4",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "SCE",
//           "sj_nm": "자본변동표",
//           "account_id": "-표준계정코드 미사용-",
//           "account_nm": "기타포괄손익-공정가치로 측정되는 금융자산의 평가손익",
//           "account_detail": "자본 [구성요소]|기타자본구성요소 [구성요소]",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "1433635565",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "6084034916",
//           "ord": "4",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "SCE",
//           "sj_nm": "자본변동표",
//           "account_id": "-표준계정코드 미사용-",
//           "account_nm": "기타포괄손익-공정가치로 측정되는 금융자산의 평가손익",
//           "account_detail": "자본 [구성요소]|자본금 [구성요소]",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "0",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "0",
//           "ord": "4",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "SCE",
//           "sj_nm": "자본변동표",
//           "account_id": "-표준계정코드 미사용-",
//           "account_nm": "기타포괄손익-공정가치로 측정되는 금융자산의 평가손익",
//           "account_detail": "자본 [구성요소]|이익잉여금 [구성요소]",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "0",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "0",
//           "ord": "4",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "SCE",
//           "sj_nm": "자본변동표",
//           "account_id": "ifrs-full_Equity",
//           "account_nm": "자본총계",
//           "account_detail": "별도재무제표 [member]",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "2431842452847",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "2105746432146",
//           "frmtrm_amount": "2306770461042",
//           "ord": "5",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "SCE",
//           "sj_nm": "자본변동표",
//           "account_id": "ifrs-full_Equity",
//           "account_nm": "자본총계",
//           "account_detail": "자본 [구성요소]|이익잉여금 [구성요소]",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "1413661998474",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "1046538602405",
//           "ord": "5",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "SCE",
//           "sj_nm": "자본변동표",
//           "account_id": "ifrs-full_Equity",
//           "account_nm": "자본총계",
//           "account_detail": "자본 [구성요소]|기타자본구성요소 [구성요소]",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "38180454373",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "79207829741",
//           "ord": "5",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "SCE",
//           "sj_nm": "자본변동표",
//           "account_id": "ifrs-full_Equity",
//           "account_nm": "자본총계",
//           "account_detail": "자본 [구성요소]|자본금 [구성요소]",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "980000000000",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "980000000000",
//           "ord": "5",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "SCE",
//           "sj_nm": "자본변동표",
//           "account_id": "ifrs-full_GainsLossesOnExchangeDifferencesOnTranslationNetOfTax",
//           "account_nm": "해외사업장환산외환차이(세후기타포괄손익)",
//           "account_detail": "별도재무제표 [member]",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "3816872380",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "9982561515",
//           "ord": "6",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "SCE",
//           "sj_nm": "자본변동표",
//           "account_id": "ifrs-full_GainsLossesOnExchangeDifferencesOnTranslationNetOfTax",
//           "account_nm": "해외사업장환산외환차이(세후기타포괄손익)",
//           "account_detail": "자본 [구성요소]|기타자본구성요소 [구성요소]",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "3816872380",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "9982561515",
//           "ord": "6",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "SCE",
//           "sj_nm": "자본변동표",
//           "account_id": "ifrs-full_GainsLossesOnExchangeDifferencesOnTranslationNetOfTax",
//           "account_nm": "해외사업장환산외환차이(세후기타포괄손익)",
//           "account_detail": "자본 [구성요소]|자본금 [구성요소]",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "0",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "0",
//           "ord": "6",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "SCE",
//           "sj_nm": "자본변동표",
//           "account_id": "ifrs-full_GainsLossesOnExchangeDifferencesOnTranslationNetOfTax",
//           "account_nm": "해외사업장환산외환차이(세후기타포괄손익)",
//           "account_detail": "자본 [구성요소]|이익잉여금 [구성요소]",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "0",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "0",
//           "ord": "6",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "SCE",
//           "sj_nm": "자본변동표",
//           "account_id": "ifrs-full_OtherComprehensiveIncomeNetOfTaxCashFlowHedges",
//           "account_nm": "세후기타포괄손익, 현금흐름위험회피",
//           "account_detail": "별도재무제표 [member]",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "390564997",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "-157642979",
//           "ord": "7",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "SCE",
//           "sj_nm": "자본변동표",
//           "account_id": "ifrs-full_OtherComprehensiveIncomeNetOfTaxCashFlowHedges",
//           "account_nm": "세후기타포괄손익, 현금흐름위험회피",
//           "account_detail": "자본 [구성요소]|기타자본구성요소 [구성요소]",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "390564997",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "-157642979",
//           "ord": "7",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "SCE",
//           "sj_nm": "자본변동표",
//           "account_id": "ifrs-full_OtherComprehensiveIncomeNetOfTaxCashFlowHedges",
//           "account_nm": "세후기타포괄손익, 현금흐름위험회피",
//           "account_detail": "자본 [구성요소]|이익잉여금 [구성요소]",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "0",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "0",
//           "ord": "7",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "SCE",
//           "sj_nm": "자본변동표",
//           "account_id": "ifrs-full_OtherComprehensiveIncomeNetOfTaxCashFlowHedges",
//           "account_nm": "세후기타포괄손익, 현금흐름위험회피",
//           "account_detail": "자본 [구성요소]|자본금 [구성요소]",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "0",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "0",
//           "ord": "7",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "SCE",
//           "sj_nm": "자본변동표",
//           "account_id": "ifrs-full_OtherComprehensiveIncomeNetOfTaxGainsLossesOnRemeasurementsOfDefinedBenefitPlans",
//           "account_nm": "확정급여제도의 재측정손익(세후기타포괄손익)",
//           "account_detail": "별도재무제표 [member]",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "-1041296056",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "-2585582388",
//           "ord": "8",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "SCE",
//           "sj_nm": "자본변동표",
//           "account_id": "ifrs-full_OtherComprehensiveIncomeNetOfTaxGainsLossesOnRemeasurementsOfDefinedBenefitPlans",
//           "account_nm": "확정급여제도의 재측정손익(세후기타포괄손익)",
//           "account_detail": "자본 [구성요소]|기타자본구성요소 [구성요소]",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "-1041296056",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "-2585582388",
//           "ord": "8",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "SCE",
//           "sj_nm": "자본변동표",
//           "account_id": "ifrs-full_OtherComprehensiveIncomeNetOfTaxGainsLossesOnRemeasurementsOfDefinedBenefitPlans",
//           "account_nm": "확정급여제도의 재측정손익(세후기타포괄손익)",
//           "account_detail": "자본 [구성요소]|자본금 [구성요소]",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "0",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "0",
//           "ord": "8",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "SCE",
//           "sj_nm": "자본변동표",
//           "account_id": "ifrs-full_OtherComprehensiveIncomeNetOfTaxGainsLossesOnRemeasurementsOfDefinedBenefitPlans",
//           "account_nm": "확정급여제도의 재측정손익(세후기타포괄손익)",
//           "account_detail": "자본 [구성요소]|이익잉여금 [구성요소]",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "0",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "0",
//           "ord": "8",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "SCE",
//           "sj_nm": "자본변동표",
//           "account_id": "ifrs-full_ProfitLoss",
//           "account_nm": "당기순이익(손실)",
//           "account_detail": "별도재무제표 [member]",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "120472214919",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "386841096482",
//           "ord": "9",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "SCE",
//           "sj_nm": "자본변동표",
//           "account_id": "ifrs-full_ProfitLoss",
//           "account_nm": "당기순이익(손실)",
//           "account_detail": "자본 [구성요소]|기타자본구성요소 [구성요소]",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "0",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "0",
//           "ord": "9",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "SCE",
//           "sj_nm": "자본변동표",
//           "account_id": "ifrs-full_ProfitLoss",
//           "account_nm": "당기순이익(손실)",
//           "account_detail": "자본 [구성요소]|이익잉여금 [구성요소]",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "120472214919",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "386841096482",
//           "ord": "9",
//           "currency": "KRW"
//       },
//       {
//           "rcept_no": "20240516002270",
//           "reprt_code": "11013",
//           "bsns_year": "2024",
//           "corp_code": "00126308",
//           "sj_div": "SCE",
//           "sj_nm": "자본변동표",
//           "account_id": "ifrs-full_ProfitLoss",
//           "account_nm": "당기순이익(손실)",
//           "account_detail": "자본 [구성요소]|자본금 [구성요소]",
//           "thstrm_nm": "제 58 기 1분기",
//           "thstrm_amount": "0",
//           "frmtrm_q_nm": "제 57 기 1분기",
//           "frmtrm_q_amount": "0",
//           "ord": "9",
//           "currency": "KRW"
//       }
//   ]
// };
// console.log(dataImsy)