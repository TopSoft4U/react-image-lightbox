/* eslint-disable import/no-extraneous-dependencies */
import "regenerator-runtime/runtime";
import {configure} from "enzyme";
import Adapter from "enzyme-adapter-react-17-updated";

configure({adapter: new Adapter()});
