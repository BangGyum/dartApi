const express = require('express')
const fs = require('fs');
const xml2js = require('xml2js');
const app = express()
const port = 3000

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

// XML 파일 경로
const xmlFilePath = './CORPCODE.xml';
let cachedData = null;  // 캐시 변수

// XML 파일을 읽고 JSON으로 변환하여 캐시
const loadXMLData = () => {
  return new Promise((resolve, reject) => {
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

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`서버가 http://localhost:${port}에서 실행 중입니다.`);
});