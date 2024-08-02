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

/*1분기보고서 : 11013
반기보고서 : 11012 
3분기보고서 : 11014
사업보고서 : 11011
*/

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

app.listen(port, () => {
  console.log(`서버가 http://localhost:${port}에서 실행 중입니다.`);
});