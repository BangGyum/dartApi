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

//2분기는 1분기 빼야함. 그럼 지금이랑 반대로 먼저 구해야하는데...?????????????/??????????????
//나중에 수작업으로 그냥 빼기??? 고민.
//아니네, 사업보고서만 빼면 됨
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
    const reprtCodeList = ['11013','11012','11014','11011'] //1분기,반기,3분기,사업 보고서
    
    let results = {}; // 결과를 저장할 객체 생성
    let yearOffset = currentYear
    let fetchedQuarters =  currentQuarter //for문 돌 분기
    let count  =  15
    
    while (count > 0 ) {

        fetchedQuarters--;
        if (fetchedQuarters === -1) {
          fetchedQuarters = 3;
          yearOffset --;
        }

        const data = await fetchFinancialIndicators(corpCode, yearOffset,  reprtCodeList[fetchedQuarters]);
        if (data.status == '013'){
          console.log('출력')
          continue
        }
        const targetItems = data.list.filter(item => item.account_nm === '영업이익' || item.account_nm === '당기순이익');
        const result = {
          quater : fetchedQuarters+1,
          // operatingProfit: targetItems.find(item => item.account_nm === '영업이익')?.thstrm_amount,
          // netIncome: targetItems.find(item => item.account_nm === '당기순이익')?.thstrm_amount
          operatingProfit: parseInt(targetItems.find(item => item.account_nm === '영업이익')?.thstrm_amount.replace(/,/g, ''), 10),
          netIncome: parseInt(targetItems.find(item => item.account_nm === '당기순이익')?.thstrm_amount.replace(/,/g, ''), 10)
        }; 
        
        results[yearOffset] = results[yearOffset] || []; // yearOffset이 없는 경우 초기화
        results[yearOffset].unshift(result); // 결과 추가
        count --;
        
    }

    calculateQoQ(results);

    res.json(results);

  } else {
      res.status(404).send('해당 corp_name을 찾을 수 없습니다.');
  }
});

function fetchFinancialIndicators(corpCode, bsnsYear, reprtCode) { //&idx_cl_code=${idxClCode}
  return new Promise(async (resolve, reject) => {

    const additionalApiUrl = `https://opendart.fss.or.kr/api/fnlttSinglAcnt.json?crtfc_key=${apiKey}&corp_code=${corpCode}&bsns_year=${bsnsYear}&reprt_code=${reprtCode}&fs_div=OFS`;
    
    try {
      // 추가 API에 요청
      console.log('--------------------------------start api----------------------------')
      console.log(additionalApiUrl, ' ++ 단일기업 재무제표 시작 ')
      const response = await axios.get(additionalApiUrl);
      console.log(additionalApiUrl, ' ++ 단일기업 재무제표 json 성공 ')

      
      // 가져온 데이터로 해결
      resolve(response.data);
    } catch (error) {
      // 오류 처리 및 프로미스 거부
      console.error('추가 API에서 데이터 가져오기 실패:', error);
      reject(error);
    }
  });
}

// 상승률 계산 함수
function calculateQoQ(data) {

  let totalOperatingProfitQoQ = 0;
  let totalNetIncomeQoQ = 0;
  let countOperatingProfit = 0;
  let countNetIncome = 0;
  
  let previousOperatingProfit = null;
  let previousNetIncome = null;
  for (const year in data) {
      let yearAddOperatingProfit = 0 
      let yearAddNetIncome = 0

      data[year].forEach((entry, index) => {
          // 문자열을 숫자로 변환 (쉼표 제거)
          console.log(entry.quater)

          let operatingProfit = entry.operatingProfit
          let netIncome = entry.netIncome

          if (entry.quater === 4) { //4분기면 1~3분기 순이익 빼줘야함, 그리고 원래 데이터 수정
            operatingProfit = operatingProfit - yearAddOperatingProfit
            netIncome = netIncome - yearAddNetIncome
          }else { //아니면 더하기
            yearAddOperatingProfit += entry.operatingProfit
            yearAddNetIncome += entry.netIncome
          }
          entry.operatingProfit = operatingProfit
          entry.netIncome = netIncome

          console.log("operatingProfit : " + operatingProfit)
          console.log("netIncome : " + netIncome)

          //1분기이면 전연도 4분기 참고
          if (index === 0) {
            const previousYear = parseInt(year) - 1;
            if (data[previousYear] && data[previousYear].length > 0) {
              const lastQuarterIndex = data[previousYear].length - 1; // 이전 연도의 4분기
              previousOperatingProfit =data[previousYear][lastQuarterIndex].operatingProfit;
              previousNetIncome =data[previousYear][lastQuarterIndex].netIncome;
            }
          }

          // 이전 분기와 비교하여 상승률 계산
          if (previousOperatingProfit !== null) {
              entry.operatingProfitQoQ = ((operatingProfit - previousOperatingProfit) / previousOperatingProfit * 100).toFixed(2);
              entry.operatingProfitQoQ = entry.operatingProfitQoQ >= 0 ? `+${entry.operatingProfitQoQ}%` : `${entry.operatingProfitQoQ}%`
          } else {
              entry.operatingProfitQoQ = null; // 첫 번째 분기는 이전 데이터가 없으므로 null
          }

          if (previousNetIncome !== null) {
              entry.netIncomeQoQ = ((netIncome - previousNetIncome) / previousNetIncome * 100).toFixed(2);
              entry.netIncomeQoQ = entry.netIncomeQoQ >= 0 ? `+${entry.netIncomeQoQ}%` : `${entry.netIncomeQoQ}%`
          } else {
              entry.netIncomeQoQ = null; // 첫 번째 분기는 이전 데이터가 없으므로 null
          }

          // 이전 값 저장
          previousOperatingProfit = operatingProfit;
          previousNetIncome = netIncome;

          //----------- 평균 계산
          // operatingProfitQoQ 계산
          if (entry.operatingProfitQoQ) {
            const growthRate = parseFloat(entry.operatingProfitQoQ.replace('%', ''));
            totalOperatingProfitQoQ += growthRate;
            countOperatingProfit++;
        }
        // netIncomeQoQ 계산
        if (entry.netIncomeQoQ) {
            const netIncomeGrowthRate = parseFloat(entry.netIncomeQoQ.replace('%', ''));
            totalNetIncomeQoQ += netIncomeGrowthRate;
            countNetIncome++;
        }
      });
  }
  // 평균 계산
  const averageOperatingProfitQoQ = totalOperatingProfitQoQ / countOperatingProfit;
  const averageNetIncomeQoQ = totalNetIncomeQoQ / countNetIncome;
  
// 평균을 data 객체에 추가
data.averageOperatingProfitQoQ = averageOperatingProfitQoQ.toFixed(2) + '%';
data.averageNetIncomeQoQ = averageNetIncomeQoQ.toFixed(2) + '%';
}

app.listen(port, () => {
  console.log(`서버가 http://localhost:${port}에서 실행 중입  니다.`);
});
