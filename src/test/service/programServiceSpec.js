// import app from '../../app'

process.env.NODE_ENV = 'test'

const app = require('../../app')
const chai = require('chai')
const chaiHttp = require('chai-http')
chai.use(chaiHttp)
const { expect } = chai

const programData = require('../testData/program.json')
const dummyData = require('../testData/dummyData');

// const host = 'http://localhost:5000'
const BASE_URL = '/program/v1'

// eslint-disable-next-line no-undef
describe('Program Service', () => {
  let programId;
  // eslint-disable-next-line no-undef
  it('it should GET all programs', (done) => {
    chai.request(app)
      .post(BASE_URL + '/list')
      .set('Accept', 'application/json')
      .send({
        request: {
          filters: {
            status: 'Live'
          }
        }
      })
      // eslint-disable-next-line handle-callback-err
      .end((err, res) => {
        expect(res.status).to.equal(200)
        done()
      })
  })

  // eslint-disable-next-line no-undef
  it('it should create a programs', (done) => {
    const program = { request: programData }
    chai.request(app)
      .post(BASE_URL + '/create')
      .set('Accept', 'application/json')
      .send(program)
      // eslint-disable-next-line handle-callback-err
      .end((err, res) => {
        expect(res.status).to.equal(200)
        done()
      })
  })

  // eslint-disable-next-line no-undef
  it('it should get program', (done) => {
    chai.request(app)
      .get(BASE_URL + '/read/' + programId)
      // eslint-disable-next-line handle-callback-err
      .end((err, res) => {
        expect(res.status).to.equal(200)
        done()
      })
  })

  // eslint-disable-next-line no-undef
  it('it should update a program', (done) => {
    const programUpdate = { request: dummyData.programUpdate }
    programUpdate.request.program_id = programId;
    chai.request(app)
      .post(BASE_URL + '/update')
      .set('Accept', 'application/json')
      .send(programUpdate)
      // eslint-disable-next-line handle-callback-err
      .end((err, res) => {
        if (!programId) {
          expect(res.status).to.equal(400)
        } else {
          expect(res.status).to.equal(200)
        }
        done()
      })
  })

  // eslint-disable-next-line no-undef
  it('it should add a nomination', (done) => {
    const nominationAdd = { request: dummyData.nominationAdd }
    nominationAdd.request.program_id = programId
    chai.request(app)
      .post(BASE_URL + '/nomination/add')
      .set('Accept', 'application/json')
      .send(nominationAdd)
      // eslint-disable-next-line handle-callback-err
      .end((err, res) => {
        expect(res.status).to.equal(200)
        done()
      })
  })

  // eslint-disable-next-line no-undef
  it('it should update a nomination', (done) => {
    const nominationUpdate = { request: dummyData.nominationUpdate }
    nominationUpdate.request.program_id = programId
    chai.request(app)
      .post(BASE_URL + '/nomination/update')
      .set('Accept', 'application/json')
      .send(nominationUpdate)
      // eslint-disable-next-line handle-callback-err
      .end((err, res) => {
        expect(res.status).to.equal(200)
        done()
      })
  })

  // eslint-disable-next-line no-undef
  // it('it should list nominations', (done) => {
  //   const nominationList = { request: {filters: dummyData.nominationList} }
  //   chai.request(app)
  //     .post(BASE_URL + '/nomination/list')
  //     .set('Accept', 'application/json')
  //     .send(nominationList)
  //     // eslint-disable-next-line handle-callback-err
  //     .end((err, res) => {
  //       expect(res.status).to.equal(200)
  //       done()
  //     })
  // })
})
