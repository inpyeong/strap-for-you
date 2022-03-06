import React, { useState, useRef } from "react";
import ChartistGraph from "react-chartist";
// react-bootstrap components
import {
    Badge,
    Button,
    Card,
    Navbar,
    Nav,
    Table,
    Container,
    Row,
    Col,
    Form,
    OverlayTrigger,
    Tooltip,
} from "react-bootstrap";

import Dropzone from "../dropzone/Dropzone";
import Progress from "progress/Progress";

function Dashboard() {
    const [state, setState] = useState({
        files: [],
        uploading: false,
        uploadProgress: {},
        successfullUploaded: false,
    });

    const dropzoneRef = useRef();


    function onFilesAdded(files) {
        // setFiles(prevFiles => prevFiles.concat(files));
        setState(prevState => {
            return {
                ...state,
                files: prevState.files.concat(files),
            };
        });
    }

    function renderProgress(file) {
        const uploadProgress = state.uploadProgress[file.name]
        if (state.uploading || state.successfullUploaded) {
            return (
                <div className="ProgressWrapper">
                    <Progress progress={uploadProgress ? uploadProgress.percentage : 0} />
                    <i className="far fa-check-circle ml-2" style={{
                            opacity: uploadProgress && uploadProgress.state === "done" ? 0.5 : 0
                    }}></i>
                </div>
            );
        }
    }

    const renderDownloadBtn = (file) => {
        const uploadProgress = state.uploadProgress[file.name]
        let btnClass = "btn-simple btn-link p-1 ", btnStatus = 'disabled';
        if (state.uploading || state.successfullUploaded) {
            if (uploadProgress && uploadProgress.state === 'done') {
                const splitted = file.name.split('.');
                const fileExt = splitted[splitted.length-1];

                const isXls = fileExt === 'xls' ? true : false;
                let fileNm = file.name + (isXls ? 'x' : '');
                
                return (
                    <a className="btn-simple btn-link p-1" href={state.uploadProgress[file.name]['downloadURL']} download={fileNm}>
                        <i className="fas fa-download"></i>
                    </a>
                );
            }
        }
        return (
            <a className="btn-simple btn-link p-1 disabled">
                <i className="fas fa-download disabled"></i>
            </a>
        );
    }

    const sendRequest = (file, idx) => {
        return new Promise((resolve, reject) => {
            const req = new XMLHttpRequest();

            req.upload.addEventListener("progress", event => {
                if (event.lengthComputable) {
                    const copy = { ...state.uploadProgress };
                    copy[file.name] = {
                        state: "pending",
                        percentage: (event.loaded / event.total) * 100
                    };
                    setState({...state, uploadProgress: copy})
                }
            });

            // req.upload.addEventListener("load", event => {
            //     const uploadProgressCopy = { ...state.uploadProgress };

            //     uploadProgressCopy[file.name] = { state: "done", percentage: 100 };
            //     setState({...state, uploadProgress: uploadProgressCopy})
            // });

            req.addEventListener("load", event => {
                const copy = { ...state.uploadProgress };

                if (req.status === 200) {
                    const downloadURL = URL.createObjectURL(req.response);
                    copy[file.name] = { state: "done", percentage: 100, downloadURL }
                } else if (req.status === 400) {
                    copy[file.name] = { state: "error", percentage: 0 }
                }

                setState({...state, uploadProgress: copy});
                resolve(req.response);
            });

            req.addEventListener("error", event => {
                reject(req.response);
            });

            req.upload.addEventListener("error", event => {
                const copy = { ...state.uploadProgress };
                copy[file.name] = { state: "error", percentage: 0 };
                setState({...state, uploadProgress: copy})
                reject(req.response);
            });

            const formData = new FormData();
            formData.append("file", file, file.name);
            formData.append("remark", file.name);

            req.open("POST", "http://localhost:8000/file/upload/");
            req.setRequestHeader("Authorization", "Basic " + Buffer.from("admin:12345").toString('base64'));
            req.responseType = "blob";
            req.send(formData);
        });
    }

    const uploadFiles = async () => {
        setState({...state, uploadProgress: {}, uploading: true})

        const promises = [];
        state.files.forEach((file, idx) => {
            promises.push(sendRequest(file, idx));
        });
        try {
            await Promise.all(promises);

            setState(prevState => {
                return {...prevState, successfullUploaded: true, uploading: false};
            });
        } catch (e) {
            // Not Production ready! Do some error handling here instead...
            setState(prevState => {
                return {...prevState, successfullUploaded: true, uploading: false};
            });
        }
    }

    function renderActions() {
        if (state.successfullUploaded) {
            return (
                <Button
                    className="btn-fill"
                    variant="success"
                    size="sm"
                    onClick={() => {
                        setState({...state, files: [], successfullUploaded: false})
                        dropzoneRef.current.setInputTarget(null);
                    }}
                >
                    Clear
                </Button>
            );
        } else {
            return (
                <Button
                    className="btn-fill"
                    variant="primary"
                    size="sm"
                    disabled={state.files.length < 0 || state.uploading}
                    onClick={uploadFiles}
                >
                    Upload
                </Button>
            );
        }
    }

    const removeFile = (fileIdx) => {
        const copy = state.files;
        copy.splice(fileIdx, 1);
        setState({...state, files: copy});
    }

    return (
        <>
            <Container fluid>
                {/* <Row>
          <Col lg="3" sm="6">
            <Card className="card-stats">
              <Card.Body>
                <Row>
                  <Col xs="5">
                    <div className="icon-big text-center icon-warning">
                      <i className="nc-icon nc-chart text-warning"></i>
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">Number</p>
                      <Card.Title as="h4">150GB</Card.Title>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
              <Card.Footer>
                <hr></hr>
                <div className="stats">
                  <i className="fas fa-redo mr-1"></i>
                  Update Now
                </div>
              </Card.Footer>
            </Card>
          </Col>
          <Col lg="3" sm="6">
            <Card className="card-stats">
              <Card.Body>
                <Row>
                  <Col xs="5">
                    <div className="icon-big text-center icon-warning">
                      <i className="nc-icon nc-light-3 text-success"></i>
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">Revenue</p>
                      <Card.Title as="h4">$ 1,345</Card.Title>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
              <Card.Footer>
                <hr></hr>
                <div className="stats">
                  <i className="far fa-calendar-alt mr-1"></i>
                  Last day
                </div>
              </Card.Footer>
            </Card>
          </Col>
          <Col lg="3" sm="6">
            <Card className="card-stats">
              <Card.Body>
                <Row>
                  <Col xs="5">
                    <div className="icon-big text-center icon-warning">
                      <i className="nc-icon nc-vector text-danger"></i>
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">Errors</p>
                      <Card.Title as="h4">23</Card.Title>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
              <Card.Footer>
                <hr></hr>
                <div className="stats">
                  <i className="far fa-clock-o mr-1"></i>
                  In the last hour
                </div>
              </Card.Footer>
            </Card>
          </Col>
          <Col lg="3" sm="6">
            <Card className="card-stats">
              <Card.Body>
                <Row>
                  <Col xs="5">
                    <div className="icon-big text-center icon-warning">
                      <i className="nc-icon nc-favourite-28 text-primary"></i>
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">Followers</p>
                      <Card.Title as="h4">+45K</Card.Title>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
              <Card.Footer>
                <hr></hr>
                <div className="stats">
                  <i className="fas fa-redo mr-1"></i>
                  Update now
                </div>
              </Card.Footer>
            </Card>
          </Col>
        </Row> */}
                <Row className="mb-4">
                    <Col md="4">
                        <Card className="h-100">
                            <Card.Header>
                                <Card.Title as="h4">Email Statistics</Card.Title>
                                <p className="card-category">Last Campaign Performance</p>
                            </Card.Header>
                            <Card.Body>
                                {/* <div
                                    className="ct-chart ct-perfect-fourth"
                                    id="chartPreferences"
                                >
                                    <ChartistGraph
                                        data={{
                                            labels: ["40%", "20%", "40%"],
                                            series: [40, 20, 40],
                                        }}
                                        type="Pie"
                                    />
                                </div> */}
                                <div className="d-flex justify-content-center align-items-center h-100">
                                    <Dropzone
                                        ref={dropzoneRef}
                                        onFilesAdded={onFilesAdded}
                                        disabled={state.uploading || state.successfullUploaded}
                                    />
                                </div>
                                {/* <div className="legend">
                                    <i className="fas fa-circle text-info"></i>
                                    Open <i className="fas fa-circle text-danger"></i>
                                    Bounce <i className="fas fa-circle text-warning"></i>
                                    Unsubscribe
                                </div> */}
                            </Card.Body>
                            <Card.Footer>
                                <hr></hr>
                                <div className="stats">
                                    <i className="far fa-clock"></i>
                                    Campaign sent 2 days ago
                                </div>
                            </Card.Footer>
                        </Card>
                    </Col>
                    <Col md="8">

                        <Card className="card-tasks h-100">
                            <Card.Header>
                                <Card.Title as="h4">Tasks</Card.Title>
                                <p className="card-category">Backend development</p>
                            </Card.Header>
                            <Card.Body>
                                <div className="table-full-width">
                                    <Table>
                                        <tbody>
                                            {state.files.map((file, idx) => {
                                                return (
                                                    <tr key={file.name}>
                                                        {/* <td>
                                                            <Form.Check className="mb-1 pl-0">
                                                                <Form.Check.Label>
                                                                    <Form.Check.Input
                                                                        defaultValue=""
                                                                        type="checkbox"
                                                                    ></Form.Check.Input>
                                                                    <span className="form-check-sign"></span>
                                                                </Form.Check.Label>
                                                            </Form.Check>
                                                        </td> */}
                                                        <td className="col-5">
                                                            {file.name}
                                                        </td>
                                                        <td className="col-5">
                                                            {renderProgress(file)}
                                                        </td>
                                                        {/* <td className="td-actions text-right col-2"> */}
                                                        <td className="text-right col-2">
                                                            {/* <OverlayTrigger
                                                                overlay={
                                                                    <Tooltip id="tooltip-488980961">
                                                                        Edit Task..
                                                                    </Tooltip>
                                                                }
                                                            > */}
                                                            {renderDownloadBtn(file)}
                                                            {/* </OverlayTrigger> */}
                                                            {/* <OverlayTrigger
                                                                overlay={
                                                                    <Tooltip id="tooltip-506045838">Remove..</Tooltip>
                                                                }
                                                            > */}
                                                                <Button
                                                                    className="btn-simple btn-link p-1"
                                                                    type="button"
                                                                    variant="danger"
                                                                    onClick={() => removeFile(idx)}
                                                                >
                                                                    <i className="fas fa-times"></i>
                                                                </Button>
                                                            {/* </OverlayTrigger> */}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </Table>
                                </div>
                            </Card.Body>
                            <Card.Footer>
                                <hr></hr>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div className="stats">
                                        <i className="now-ui-icons loader_refresh spin"></i>
                                        Updated 3 minutes ago
                                    </div>
                                    <div className="Actions">
                                        {renderActions()}
                                    </div>
                                </div>
                            </Card.Footer>
                        </Card>
                    </Col>
                </Row>
                <Row>
                    <Col md="6">
                        <Card>
                            <Card.Header>
                                <Card.Title as="h4">2017 Sales</Card.Title>
                                <p className="card-category">All products including Taxes</p>
                            </Card.Header>
                            <Card.Body>
                                <div className="ct-chart" id="chartActivity">
                                    <ChartistGraph
                                        data={{
                                            labels: [
                                                "Jan",
                                                "Feb",
                                                "Mar",
                                                "Apr",
                                                "Mai",
                                                "Jun",
                                                "Jul",
                                                "Aug",
                                                "Sep",
                                                "Oct",
                                                "Nov",
                                                "Dec",
                                            ],
                                            series: [
                                                [
                                                    542,
                                                    443,
                                                    320,
                                                    780,
                                                    553,
                                                    453,
                                                    326,
                                                    434,
                                                    568,
                                                    610,
                                                    756,
                                                    895,
                                                ],
                                                [
                                                    412,
                                                    243,
                                                    280,
                                                    580,
                                                    453,
                                                    353,
                                                    300,
                                                    364,
                                                    368,
                                                    410,
                                                    636,
                                                    695,
                                                ],
                                            ],
                                        }}
                                        type="Bar"
                                        options={{
                                            seriesBarDistance: 10,
                                            axisX: {
                                                showGrid: false,
                                            },
                                            height: "245px",
                                        }}
                                        responsiveOptions={[
                                            [
                                                "screen and (max-width: 640px)",
                                                {
                                                    seriesBarDistance: 5,
                                                    axisX: {
                                                        labelInterpolationFnc: function (value) {
                                                            return value[0];
                                                        },
                                                    },
                                                },
                                            ],
                                        ]}
                                    />
                                </div>
                            </Card.Body>
                            <Card.Footer>
                                <div className="legend">
                                    <i className="fas fa-circle text-info"></i>
                                    Tesla Model S <i className="fas fa-circle text-danger"></i>
                                    BMW 5 Series
                                </div>
                                <hr></hr>
                                <div className="stats">
                                    <i className="fas fa-check"></i>
                                    Data information certified
                                </div>
                            </Card.Footer>
                        </Card>
                    </Col>
                    <Col md="6">

                        <Card>
                            <Card.Header>
                                <Card.Title as="h4">Users Behavior</Card.Title>
                                <p className="card-category">24 Hours performance</p>
                            </Card.Header>
                            <Card.Body>
                                <div className="ct-chart" id="chartHours">
                                    <ChartistGraph
                                        data={{
                                            labels: [
                                                "9:00AM",
                                                "12:00AM",
                                                "3:00PM",
                                                "6:00PM",
                                                "9:00PM",
                                                "12:00PM",
                                                "3:00AM",
                                                "6:00AM",
                                            ],
                                            series: [
                                                [287, 385, 490, 492, 554, 586, 698, 695],
                                                [67, 152, 143, 240, 287, 335, 435, 437],
                                                [23, 113, 67, 108, 190, 239, 307, 308],
                                            ],
                                        }}
                                        type="Line"
                                        options={{
                                            low: 0,
                                            high: 800,
                                            showArea: false,
                                            height: "245px",
                                            axisX: {
                                                showGrid: false,
                                            },
                                            lineSmooth: true,
                                            showLine: true,
                                            showPoint: true,
                                            fullWidth: true,
                                            chartPadding: {
                                                right: 50,
                                            },
                                        }}
                                        responsiveOptions={[
                                            [
                                                "screen and (max-width: 640px)",
                                                {
                                                    axisX: {
                                                        labelInterpolationFnc: function (value) {
                                                            return value[0];
                                                        },
                                                    },
                                                },
                                            ],
                                        ]}
                                    />
                                </div>
                            </Card.Body>
                            <Card.Footer>
                                <div className="legend">
                                    <i className="fas fa-circle text-info"></i>
                                    Open <i className="fas fa-circle text-danger"></i>
                                    Click <i className="fas fa-circle text-warning"></i>
                                    Click Second Time
                                </div>
                                <hr></hr>
                                <div className="stats">
                                    <i className="fas fa-history"></i>
                                    Updated 3 minutes ago
                                </div>
                            </Card.Footer>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </>
    );
}

export default Dashboard;
