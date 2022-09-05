import React from "react";
import ReactDOM from "react-dom";
import { buildAllRoutes, checkAllRoutes } from './scripts/trade'


interface IProps {
}

interface IState {
  isBegun?: boolean;
}

class App extends React.Component<IProps, IState> {
  constructor(props: any) {
    super(props);
    this.state = {
      isBegun: false
    };
  }

  async componentDidMount() {
    // let instance = await tronWeb.contract(FactoryABI,"TLzE74DtFAfJgZvCww8ru1qVBCyuSVFRVx")
    // let res = await instance.allPairsLength().call()
    // console.log(res)

    await buildAllRoutes();
  }

  beginBalance() {
    setInterval(async () => {
      await checkAllRoutes();
    }, 3000);
    this.setState({isBegun: true})
  }

  render() {
    return (
      <div className="App">
        <button disabled={this.state.isBegun} onClick={() => this.beginBalance()}>Start Balancing Prices of two DEX</button>
      </div>
    );
  }
}

ReactDOM.render(
  <App />,
  document.getElementById("root")
);
