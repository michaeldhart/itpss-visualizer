const path = require("path");
const webpack = require("webpack");

module.exports = {
    mode: "development",
    devtool: "source-map",
    entry: "./src/main.ts",
    resolve: {
        extensions: [".ts", ".js"]
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                include: path.resolve(__dirname, "src"),
                loader: "ts-loader"
            }
        ]
    },
    output: {
        path: path.resolve(__dirname, "public"),
        publicPath: "/public/",
        filename: "main.js"
    },
    devServer: {
        contentBase: path.join(__dirname, "public/"),
        port: 3000,
        publicPath: "http://localhost:3000/public/",
        hotOnly: true
    },
    plugins: [new webpack.HotModuleReplacementPlugin()]
};