const express = require('express')
require('dotenv').config();
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const xml2js = require('xml2js');
const AdmZip = require('adm-zip');
const app = express()
const port = 3000

const apiKey = process.env.API_KEY;
const API_URL = `https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${apiKey}`;
const OUTPUT_ZIP_PATH = path.join(__dirname, 'companies.zip'); // 다운로드할 ZIP 파일 경로
const OUTPUT_FILE_PATH = path.join(__dirname, './corpCode/CORPCODE.xml'); // 저장할 파일 경로
const UNZIP_DIR = path.join(__dirname, '/corpCode'); // 압축 해제할 디렉토리

const xmlFilePath = './corpCode/CORPCODE.xml';// XML 파일 경로

let cachedData = null;  // 캐시 변수

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
      const response = await axios.get(API_URL, { responseType: 'arraybuffer' });
      
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

// corp_name으로 corp_code 검색 (쿼리 파라미터 사용)
app.get('/corp_code', (req, res) => {
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
    
    // 다른 함수로 호출 (예시로 다른 함수를 호출)
    fetchFinancialIndicators(corpCode)
        .then(data => res.json(data)) // 다른 함수에서 반환된 데이터를 클라이언트에 응답
        .catch(err => res.status(500).send('서버 오류'));
  } else {
      res.status(404).send('해당 corp_name을 찾을 수 없습니다.');
  }
});

function fetchFinancialIndicators(corpCode) {
  return new Promise(async (resolve, reject) => {
    // 추가 API 엔드포인트 정의
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
    const bsnsYear = '2024' //사업연도
    const reprtCode = '11013'
    const idxClCode = 'M210000'
    const additionalApiUrl = `https://opendart.fss.or.kr/api/fnlttSinglIndx.json?crtfc_key=${apiKey}&corp_code=${corpCode}&bsns_year=${bsnsYear}&reprt_code=${reprtCode}&idx_cl_code=${idxClCode}`;
    
    try {
      // 추가 API에 요청
      const response = await axios.get(additionalApiUrl);
      
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