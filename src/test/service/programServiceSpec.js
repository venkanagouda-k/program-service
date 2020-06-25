// import app from '../../app'

process.env.NODE_ENV = 'test'

const app = require('../../app')
const chai = require('chai')
const chaiHttp = require('chai-http')
chai.use(chaiHttp)
const { expect } = chai

const programData = require('../testData/program.json')

// const host = 'http://localhost:5000'
const BASE_URL = '/program/v1'

// eslint-disable-next-line no-undef
describe('Program Service', () => {
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
})
